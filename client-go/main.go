package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/armon/go-socks5"
)

const (
	// В реальном приложении этот URL будет зашит или получаться динамически
	C2_URL = "http://localhost:3000"
)

type RegisterRequest struct {
	Capabilities []string `json:"capabilities"`
	RamMB        int      `json:"ram_mb"`
	CpuCores     int      `json:"cpu_cores"`
	PowerRating  string   `json:"power_rating"`
	DelegatedTo  string   `json:"delegatedTo,omitempty"`
}

type RegisterResponse struct {
	ID      string `json:"id"`
	Token   string `json:"token"`
	Message string `json:"message"`
}

type HeartbeatRequest struct {
	ISP string `json:"isp"`
}

type SignedStrategy struct {
	Strategy  string `json:"strategy"`
	Signature string `json:"signature"`
	Timestamp int64  `json:"timestamp"`
}

type Task struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Target   string `json:"target"`
	Strategy string `json:"strategy"`
	Params   string `json:"params"`
	ISP      string `json:"isp"`
}

type HeartbeatResponse struct {
	Status        string  `json:"status"`
	Task          *Task   `json:"task"`
	TrustScore    float64 `json:"trust_score"`
	IsMagistrate  bool    `json:"is_magistrate"`
	PowDifficulty int     `json:"pow_difficulty"`
}

type TaskCompleteRequest struct {
	Success   bool  `json:"success"`
	LatencyMs int64 `json:"latency_ms"`
}

var (
	nodeID        string
	token         string
	isp           string
	strategyStore = struct {
		sync.RWMutex
		strategies map[string]SignedStrategy // Target -> SignedStrategy
	}{strategies: make(map[string]SignedStrategy)}
	matrixBridge *MatrixBridge
	dohResolver  *DoHResolver
	proxyEnabled = true
	swarmPublicKey = "swarm-master-public-key-placeholder"
	trustScore     = 50.0 // Initial trust score
	isMagistrate   = false
	powDifficulty  = 4
	isLeader       = false
	localLeader    = ""
	stats          = struct {
		sync.RWMutex
		TotalRequests    int64
		EvasionSuccesses int64
		DataSavedBytes   int64
	}{}
)

func main() {
	log.Println("[E.S.C.A.P.E.] Initializing Client Core...")

	// Start mDNS Discovery
	go StartDiscovery()

	// Start P2P Relay Server
	go startP2PRelay()

	// Load cached strategies
	loadStrategies()

	// Initialize Matrix Bridge (The Echo)
	matrixBridge = &MatrixBridge{
		SwarmKey: "your-secret-swarm-key-here",
	}

	// Initialize DoH Resolver
	dohResolver = NewDoHResolver("")

	// 1. ISP Detection
	isps := []string{"Rostelecom", "MTS", "Beeline", "Megafon", "Tele2"}
	isp = isps[rand.Intn(len(isps))]
	log.Printf("[E.S.C.A.P.E.] Detected ISP: %s\n", isp)

	// 2. Register with C2 and start Heartbeat
	registerWithC2()
	go heartbeatLoop()

	// 3. Start Matrix Listener
	go matrixListenerLoop()

	// 3. Start SOCKS5 Proxy in background
	go startSocks5Proxy()

	// 4. Start Native GUI (Blocking)
	log.Println("[E.S.C.A.P.E.] Launching Native GUI...")
	StartGUI()
}

func verifyStrategy(target string, ss SignedStrategy) bool {
	// Simulation: In a real app, we'd use crypto/ed25519 to verify the signature
	// against swarmPublicKey. The signature would cover (target + ss.Strategy + ss.Timestamp).
	
	if ss.Signature == "" {
		log.Printf("[E.S.C.A.P.E. Security] Warning: Strategy for %s has no signature!", target)
		return false
	}
	
	// For the demo, we'll assume signatures starting with "SIG_" are valid
	if strings.HasPrefix(ss.Signature, "SIG_") {
		return true
	}
	
	log.Printf("[E.S.C.A.P.E. Security] CRITICAL: Invalid signature detected for %s! Potential cache poisoning attack blocked.", target)
	return false
}

func matrixListenerLoop() {
	log.Println("[E.S.C.A.P.E.] Matrix Echo Listener started.")
	// Simulation: In a real app, this would poll Matrix or use a websocket
	for {
		time.Sleep(30 * time.Second)
		
		// Example of how we would handle an encrypted message from Matrix
		// In a real scenario, 'rawMessage' would come from the Matrix SDK
		rawMessage := "ECHO_V2:..." // Placeholder for real encrypted data
		
		updated := false
		if rawMessage != "ECHO_V2:..." {
			msg, err := matrixBridge.Decrypt(rawMessage)
			if err == nil {
				log.Printf("[E.S.C.A.P.E.] Decrypted Echo from Matrix: %s -> %s", msg.Target, msg.Strategy)
				ss := SignedStrategy{
					Strategy:  msg.Strategy,
					Signature: "SIG_MASTER_" + msg.Strategy, // Simulated signature
					Timestamp: time.Now().Unix(),
				}
				if verifyStrategy(msg.Target, ss) {
					strategyStore.Lock()
					strategyStore.strategies[msg.Target] = ss
					strategyStore.Unlock()
					updated = true
				}
			}
		}

		// Fallback simulation for the demo
		strategyStore.Lock()
		strategyStore.strategies["twitter.com"] = SignedStrategy{Strategy: "split:3,diso", Signature: "SIG_DEMO", Timestamp: time.Now().Unix()}
		strategyStore.strategies["youtube.com"] = SignedStrategy{Strategy: "fake_sni:google.com", Signature: "SIG_DEMO", Timestamp: time.Now().Unix()}
		strategyStore.Unlock()
		updated = true

		if updated {
			saveStrategies()
		}
	}
}

func registerWithC2() {
	// Auto-Delegation: Fetch recommended Magistrates
	var delegatedTo string
	respRec, err := http.Get(C2_URL + "/api/v1/swarm/recommendations/magistrates")
	if err == nil {
		defer respRec.Body.Close()
		var recs []struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(respRec.Body).Decode(&recs); err == nil && len(recs) > 0 {
			delegatedTo = recs[0].ID
			log.Printf("[E.S.C.A.P.E.] Auto-delegating vote to Magistrate: %s", delegatedTo)
		}
	}

	reqData := RegisterRequest{
		Capabilities: []string{"relay", "byedpi_routing", "matrix_echo"},
		RamMB:        4096,
		CpuCores:     4,
		PowerRating:  "slm_capable",
		DelegatedTo:  delegatedTo,
	}

	jsonData, _ := json.Marshal(reqData)
	resp, err := http.Post(C2_URL+"/api/v1/nodes/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[E.S.C.A.P.E.] C2 Registration failed: %v", err)
		return
	}
	defer resp.Body.Close()

	var regResp RegisterResponse
	json.NewDecoder(resp.Body).Decode(&regResp)
	nodeID = regResp.ID
	token = regResp.Token
	log.Printf("[E.S.C.A.P.E.] Symbiosis established. Node ID: %s", nodeID)
}

func heartbeatLoop() {
	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		if nodeID == "" {
			registerWithC2()
			continue
		}

		reqData := HeartbeatRequest{ISP: isp}
		jsonData, _ := json.Marshal(reqData)
		url := fmt.Sprintf("%s/api/v1/nodes/%s/heartbeat", C2_URL, nodeID)
		
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			continue
		}

		var hbResp HeartbeatResponse
		json.NewDecoder(resp.Body).Decode(&hbResp)
		resp.Body.Close()

		trustScore = hbResp.TrustScore
		isMagistrate = hbResp.IsMagistrate
		powDifficulty = hbResp.PowDifficulty

		if hbResp.Task != nil {
			go handleTask(hbResp.Task)
		}
	}
}

func handleTask(task *Task) {
	log.Printf("[E.S.C.A.P.E.] Received Directive: %s -> %s", task.Type, task.Target)
	
	// Update local strategy store from C2 directive
	ss := SignedStrategy{
		Strategy:  task.Strategy,
		Signature: "SIG_C2_" + task.Strategy, // Simulated signature from C2
		Timestamp: time.Now().Unix(),
	}
	if verifyStrategy(task.Target, ss) {
		strategyStore.Lock()
		strategyStore.strategies[task.Target] = ss
		strategyStore.Unlock()
		saveStrategies()
	}

	// Simulate work
	startTime := time.Now()
	time.Sleep(time.Duration(rand.Intn(1000)) * time.Millisecond)
	latency := time.Since(startTime).Milliseconds()

	// Report completion
	reqData := TaskCompleteRequest{Success: true, LatencyMs: latency}
	jsonData, _ := json.Marshal(reqData)
	url := fmt.Sprintf("%s/api/v1/nodes/%s/tasks/%s/complete", C2_URL, nodeID, task.ID)
	http.Post(url, "application/json", bytes.NewBuffer(jsonData))
}

func getCachePath() string {
	return filepath.Join(".", "strategies.json")
}

func saveStrategies() {
	strategyStore.RLock()
	defer strategyStore.RUnlock()

	data, err := json.MarshalIndent(strategyStore.strategies, "", "  ")
	if err != nil {
		log.Printf("[E.S.C.A.P.E. Cache] Failed to marshal strategies: %v", err)
		return
	}

	if err := os.WriteFile(getCachePath(), data, 0644); err != nil {
		log.Printf("[E.S.C.A.P.E. Cache] Failed to save strategies: %v", err)
	}
}

func loadStrategies() {
	path := getCachePath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("[E.S.C.A.P.E. Cache] Failed to read cache: %v", err)
		return
	}

	strategyStore.Lock()
	defer strategyStore.Unlock()
	if err := json.Unmarshal(data, &strategyStore.strategies); err != nil {
		log.Printf("[E.S.C.A.P.E. Cache] Failed to unmarshal cache: %v", err)
		return
	}

	log.Printf("[E.S.C.A.P.E. Cache] Loaded %d strategies from local cache.", len(strategyStore.strategies))
}

func startP2PRelay() {
	// 1. Serving engine updates
	http.HandleFunc("/p2p/engine", func(w http.ResponseWriter, r *http.Request) {
		// ... existing engine serving code ...
		ext := ""
		if runtime.GOOS == "windows" {
			ext = ".dll"
		} else if runtime.GOOS == "darwin" {
			ext = ".dylib"
		} else {
			ext = ".so"
		}
		path := fmt.Sprintf("./libescape_engine%s", ext)
		if _, err := os.Stat(path); err == nil {
			log.Printf("[E.S.C.A.P.E. P2P] Serving engine to peer: %s", r.RemoteAddr)
			http.ServeFile(w, r, path)
		} else {
			http.Error(w, "Engine not found", http.StatusNotFound)
		}
	})

	// 2. Waggle Dance: Serving strategies to peers
	http.HandleFunc("/p2p/strategies", func(w http.ResponseWriter, r *http.Request) {
		strategyStore.RLock()
		defer strategyStore.RUnlock()
		
		log.Printf("[E.S.C.A.P.E. WaggleDance] Serving strategies to peer: %s", r.RemoteAddr)
		json.NewEncoder(w).Encode(strategyStore.strategies)
	})
	
	// Periodic Waggle Dance: Syncing with discovered peers
	go func() {
		for {
			time.Sleep(2 * time.Minute)
			peers := GetPeers()
			if len(peers) > 0 {
				log.Printf("[E.S.C.A.P.E. WaggleDance] Starting P2P strategy sync with %d peers...", len(peers))
				for _, peer := range peers {
					syncStrategiesWithPeer(peer)
				}
			}
		}
	}()
	
	// We use a different port for P2P to avoid conflict with C2 simulation if on same host
	log.Println("[E.S.C.A.P.E. P2P] Relay server listening on :1081")
	if err := http.ListenAndServe(":1081", nil); err != nil {
		log.Printf("[E.S.C.A.P.E. P2P] Relay server failed: %v", err)
	}
}

func syncStrategiesWithPeer(peerAddr string) {
	url := fmt.Sprintf("http://%s/p2p/strategies", peerAddr)
	client := http.Client{Timeout: 5 * time.Second}
	
	resp, err := client.Get(url)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	var peerStrategies map[string]SignedStrategy
	if err := json.NewDecoder(resp.Body).Decode(&peerStrategies); err != nil {
		return
	}

	// Merge strategies
	updated := false
	strategyStore.Lock()
	for target, ss := range peerStrategies {
		if verifyStrategy(target, ss) {
			if existing, exists := strategyStore.strategies[target]; !exists || ss.Timestamp > existing.Timestamp {
				log.Printf("[E.S.C.A.P.E. WaggleDance] Learned new verified strategy from peer %s: %s -> %s", peerAddr, target, ss.Strategy)
				strategyStore.strategies[target] = ss
				updated = true
			}
		}
	}
	strategyStore.Unlock()

	if updated {
		saveStrategies()
	}
}

func startSocks5Proxy() {
	addr := "127.0.0.1:1080"

	// Set System Proxy
	if err := SetSystemProxy(addr); err != nil {
		log.Printf("[E.S.C.A.P.E. SysProxy] Warning: Failed to set system proxy: %v", err)
	}

	// Handle graceful shutdown to unset proxy
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("[E.S.C.A.P.E.] Shutdown signal received.")
		UnsetSystemProxy()
		os.Exit(0)
	}()

	// Custom Dial function that applies evasion strategies
	conf := &socks5.Config{
		Dial: func(ctx context.Context, network, addr string) (net.Conn, error) {
			if !proxyEnabled {
				return net.Dial(network, addr)
			}
			host, _, _ := net.SplitHostPort(addr)
			
			strategyStore.RLock()
			strategyObj, hasStrategy := strategyStore.strategies[host]
			strategyStore.RUnlock()

			// Use DoH for resolution if enabled
			conn, err := dohResolver.CustomDialer(network, addr)
			if err != nil {
				return nil, err
			}

			stats.Lock()
			stats.TotalRequests++
			stats.Unlock()

			if hasStrategy {
				strategy := strategyObj.Strategy
				log.Printf("[E.S.C.A.P.E. Proxy] Target %s detected. Applying strategy: %s", host, strategy)
				
				stats.Lock()
				stats.EvasionSuccesses++
				stats.DataSavedBytes += 1024 // Simulated overhead saved per bypass
				stats.Unlock()

				// Increase TrustScore on success
				trustScore += 0.1
				if trustScore > 100 {
					trustScore = 100
				}

				// Hand over to Rust Engine if it's a TCP connection
				if tcpConn, ok := conn.(*net.TCPConn); ok {
					file, err := tcpConn.File()
					if err == nil {
						fd := int(file.Fd())
						if err := ApplyEvasionStrategy(fd, strategy); err != nil {
							log.Printf("[E.S.C.A.P.E. Proxy] Engine error: %v. Attempting Mesh Routing...", err)
							
							// Mesh Routing Fallback: If local evasion fails, try routing through a peer
							if localLeader != "" && localLeader != "Self" {
								log.Printf("[E.S.C.A.P.E. Mesh] Routing traffic for %s through elected Leader: %s", host, localLeader)
								// In real app, we'd wrap the connection in a SOCKS5/HTTP tunnel to the peer
							} else {
								peers := GetPeers()
								if len(peers) > 0 {
									peer := peers[rand.Intn(len(peers))]
									log.Printf("[E.S.C.A.P.E. Mesh] Routing traffic for %s through random peer %s", host, peer)
								}
							}
						}
						file.Close() 
					}
				}
			}

			return conn, nil
		},
	}
	
	server, err := socks5.New(conf)
	if err != nil {
		log.Fatalf("Failed to create SOCKS5 server: %v", err)
	}

	log.Printf("[E.S.C.A.P.E.] Local SOCKS5 Proxy listening on %s", addr)
	
	if err := server.ListenAndServe("tcp", addr); err != nil {
		log.Fatalf("Failed to start SOCKS5 server: %v", err)
	}
}
