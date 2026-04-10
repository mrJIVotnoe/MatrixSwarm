package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/hashicorp/mdns"
)

var (
	peerStore = struct {
		sync.RWMutex
		peers map[string]time.Time // IP:Port -> LastSeen
	}{peers: make(map[string]time.Time)}
)

// StartDiscovery initializes mDNS advertising and periodic discovery
func StartDiscovery() {
	log.Println("[E.S.C.A.P.E. Discovery] Starting mDNS node discovery...")

	// 1. Setup mDNS advertising
	host, _ := os.Hostname()
	info := []string{"ESCAPE Node"}
	service, err := mdns.NewMDNSService(host, "_escape._tcp", "", "", 1081, nil, info)
	if err != nil {
		log.Printf("[E.S.C.A.P.E. Discovery] Failed to setup mDNS service: %v", err)
		return
	}

	server, err := mdns.NewServer(&mdns.Config{Zone: service})
	if err != nil {
		log.Printf("[E.S.C.A.P.E. Discovery] Failed to start mDNS server: %v", err)
		return
	}
	defer server.Shutdown()

	// 2. Periodic discovery loop
	for {
		discoverPeers()
		time.Sleep(1 * time.Minute)
	}
}

func discoverPeers() {
	entriesCh := make(chan *mdns.ServiceEntry, 10)
	go func() {
		for entry := range entriesCh {
			peerAddr := fmt.Sprintf("%s:%d", entry.AddrV4, entry.Port)
			
			// Don't add ourselves (simple check)
			if isLocalIP(entry.AddrV4) && entry.Port == 1081 {
				continue
			}

			peerStore.Lock()
			if _, exists := peerStore.peers[peerAddr]; !exists {
				log.Printf("[E.S.C.A.P.E. Discovery] Found new peer: %s (%s)", peerAddr, entry.Name)
			}
			peerStore.peers[peerAddr] = time.Now()
			peerStore.Unlock()
		}
	}()

	params := mdns.DefaultParams("_escape._tcp")
	params.Entries = entriesCh
	params.DisableIPv6 = true
	params.Wait = 2 * time.Second
	
	mdns.Query(params)
	close(entriesCh)
}

func isLocalIP(ip net.IP) bool {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return false
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil && ipnet.IP.Equal(ip) {
				return true
			}
		}
	}
	return false
}

// GetPeers returns a list of currently active peers
func GetPeers() []string {
	peerStore.RLock()
	defer peerStore.RUnlock()
	
	var list []string
	now := time.Now()
	for addr, lastSeen := range peerStore.peers {
		// Only return peers seen in the last 5 minutes
		if now.Sub(lastSeen) < 5*time.Minute {
			list = append(list, addr)
		}
	}
	return list
}
