package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"
)

// DoHResponse represents a simplified DNS-over-HTTPS response (JSON format)
type DoHResponse struct {
	Status   int `json:"Status"`
	Question []struct {
		Name string `json:"name"`
		Type int    `json:"type"`
	} `json:"Question"`
	Answer []struct {
		Name string `json:"name"`
		Type int    `json:"type"`
		TTL  int    `json:"TTL"`
		Data string `json:"data"`
	} `json:"Answer"`
}

// DoHResolver implements a DNS-over-HTTPS resolver using Cloudflare or Google
type DoHResolver struct {
	Endpoint string
	Client   *http.Client
}

func NewDoHResolver(endpoint string) *DoHResolver {
	if endpoint == "" {
		endpoint = "https://cloudflare-dns.com/dns-query"
	}
	return &DoHResolver{
		Endpoint: endpoint,
		Client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Resolve performs a DoH query for A records
func (r *DoHResolver) Resolve(ctx context.Context, name string) ([]string, error) {
	url := fmt.Sprintf("%s?name=%s&type=A", r.Endpoint, name)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/dns-json")

	resp, err := r.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("DoH server returned status %d", resp.StatusCode)
	}

	var dohResp DoHResponse
	if err := json.NewDecoder(resp.Body).Decode(&dohResp); err != nil {
		return nil, err
	}

	var ips []string
	for _, answer := range dohResp.Answer {
		if answer.Type == 1 { // Type A
			ips = append(ips, answer.Data)
		}
	}

	if len(ips) == 0 {
		return nil, fmt.Errorf("no A records found for %s", name)
	}

	return ips, nil
}

// CustomDialer returns a dialer that uses DoH for name resolution
func (r *DoHResolver) CustomDialer(network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	// If it's already an IP, just dial
	if ip := net.ParseIP(host); ip != nil {
		return net.Dial(network, addr)
	}

	log.Printf("[E.S.C.A.P.E. DoH] Resolving %s via DoH...", host)
	ips, err := r.Resolve(context.Background(), host)
	if err != nil {
		log.Printf("[E.S.C.A.P.E. DoH] Warning: DoH failed for %s: %v. Falling back to system DNS.", host, err)
		return net.Dial(network, addr)
	}

	// Try IPs until one works
	var lastErr error
	for _, ip := range ips {
		conn, err := net.Dial(network, net.JoinHostPort(ip, port))
		if err == nil {
			return conn, nil
		}
		lastErr = err
	}

	return nil, lastErr
}
