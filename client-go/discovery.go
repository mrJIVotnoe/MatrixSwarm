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
		peers map[string]PeerInfo // IP:Port -> PeerInfo
	}{peers: make(map[string]PeerInfo)}
)

type PeerInfo struct {
	NodeID     string
	LastSeen   time.Time
	TrustScore float64
	IsLeader   bool
	IsVerified bool
	Name       string
}

// StartDiscovery initializes mDNS advertising and periodic discovery
func StartDiscovery() {
	log.Println("[E.S.C.A.P.E. Discovery] Starting mDNS node discovery...")

	// 1. Setup mDNS advertising
	host, _ := os.Hostname()
	
	// Periodic re-advertising to update scores
	for {
		info := []string{
			fmt.Sprintf("NodeID:%s", nodeID),
			fmt.Sprintf("TrustScore:%.2f", trustScore),
			fmt.Sprintf("IsLeader:%v", isLeader),
		}
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

		// Discover peers
		discoverPeers()
		
		// Run Leader Election
		electLeader()

		time.Sleep(30 * time.Second)
		server.Shutdown()
	}
}

func electLeader() {
	peerStore.RLock()
	defer peerStore.RUnlock()

	bestScore := trustScore
	bestPeer := ""
	
	for addr, info := range peerStore.peers {
		if time.Since(info.LastSeen) < 2*time.Minute && info.IsVerified {
			if info.TrustScore > bestScore {
				bestScore = info.TrustScore
				bestPeer = addr
			}
		}
	}

	if bestPeer == "" {
		if !isLeader {
			log.Println("[E.S.C.A.P.E. Election] I am the local Leader (Best TrustScore).")
			isLeader = true
			localLeader = "Self"
		}
	} else {
		if isLeader || localLeader != bestPeer {
			log.Printf("[E.S.C.A.P.E. Election] New Leader elected: %s (TrustScore: %.2f)", bestPeer, bestScore)
			isLeader = false
			localLeader = bestPeer
		}
	}
}

func discoverPeers() {
	entriesCh := make(chan *mdns.ServiceEntry, 10)
	go func() {
		for entry := range entriesCh {
			peerAddr := fmt.Sprintf("%s:%d", entry.AddrV4, entry.Port)
			
			// Don't add ourselves
			if isLocalIP(entry.AddrV4) && entry.Port == 1081 {
				continue
			}

			pTrustScore := 0.0
			pIsLeader := false
			pNodeID := ""
			for _, field := range entry.InfoFields {
				if strings.HasPrefix(field, "NodeID:") {
					pNodeID = strings.TrimPrefix(field, "NodeID:")
				}
				if strings.HasPrefix(field, "TrustScore:") {
					fmt.Sscanf(field, "TrustScore:%f", &pTrustScore)
				}
				if strings.HasPrefix(field, "IsLeader:") {
					fmt.Sscanf(field, "IsLeader:%v", &pIsLeader)
				}
			}

			peerStore.Lock()
			existing, exists := peerStore.peers[peerAddr]
			
			// If new peer or NodeID changed, trigger verification
			shouldVerify := !exists || existing.NodeID != pNodeID || (pTrustScore > existing.TrustScore + 5.0)

			peerStore.peers[peerAddr] = PeerInfo{
				NodeID:     pNodeID,
				LastSeen:   time.Now(),
				TrustScore: pTrustScore,
				IsLeader:   pIsLeader,
				IsVerified: exists && existing.IsVerified && !shouldVerify,
				Name:       entry.Name,
			}
			peerStore.Unlock()

			if shouldVerify && pNodeID != "" {
				go verifyPeer(peerAddr, pNodeID, pTrustScore)
			}
		}
	}()

	params := mdns.DefaultParams("_escape._tcp")
	params.Entries = entriesCh
	params.DisableIPv6 = true
	params.Wait = 2 * time.Second
	
	mdns.Query(params)
	close(entriesCh)
}

func verifyPeer(addr, nodeID string, claimedScore float64) {
	log.Printf("[E.S.C.A.P.E. Security] Verifying TrustScore for Node %s via Matrix...", nodeID)
	
	// Simulation: Query Matrix/C2 for the real score of this NodeID
	time.Sleep(2 * time.Second)
	
	// In a real app, we'd call matrixBridge.GetVerifiedScore(nodeID)
	// For demo: if NodeID contains "MALICIOUS", verification fails
	isValid := !strings.Contains(strings.ToUpper(nodeID), "MALICIOUS")
	
	peerStore.Lock()
	defer peerStore.RUnlock()
	if info, ok := peerStore.peers[addr]; ok {
		if isValid {
			log.Printf("[E.S.C.A.P.E. Security] Node %s VERIFIED. TrustScore %.2f is authentic.", nodeID, claimedScore)
			info.IsVerified = true
		} else {
			log.Printf("[E.S.C.A.P.E. Security] ATTACK DETECTED! Node %s failed verification. Dropping TrustScore to 0.", nodeID)
			info.TrustScore = 0
			info.IsVerified = false
		}
		peerStore.peers[addr] = info
	}
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
