package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
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
}

type RegisterResponse struct {
	ID      string `json:"id"`
	Token   string `json:"token"`
	Message string `json:"message"`
}

type HeartbeatRequest struct {
	ISP string `json:"isp"`
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
	Status     string  `json:"status"`
	Task       *Task   `json:"task"`
	TrustScore float64 `json:"trust_score"`
}

type TaskCompleteRequest struct {
	Success   bool  `json:"success"`
	LatencyMs int64 `json:"latency_ms"`
}

var (
	nodeID string
	token  string
	isp    string
)

func main() {
	log.Println("[E.S.C.A.P.E.] Initializing Client Core...")

	// 1. Определение провайдера (Пока симулируем, в реальности можно использовать IP API)
	isps := []string{"Rostelecom", "MTS", "Beeline", "Megafon", "Tele2"}
	isp = isps[rand.Intn(len(isps))]
	log.Printf("[E.S.C.A.P.E.] Detected ISP: %s\n", isp)

	// 2. Регистрация в Улье (C2)
	registerWithC2()

	// 3. Запуск цикла Heartbeat (Пульс)
	go heartbeatLoop()

	// 4. Запуск локального SOCKS5 прокси
	startSocks5Proxy()
}

func registerWithC2() {
	reqData := RegisterRequest{
		Capabilities: []string{"relay", "byedpi_routing"},
		RamMB:        4096,
		CpuCores:     4,
		PowerRating:  "slm_capable (Medium)",
	}

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		log.Fatalf("Failed to marshal register request: %v", err)
	}

	resp, err := http.Post(C2_URL+"/api/v1/nodes/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatalf("Failed to connect to C2: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("C2 returned status: %d", resp.StatusCode)
	}

	var regResp RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&regResp); err != nil {
		log.Fatalf("Failed to decode C2 response: %v", err)
	}

	nodeID = regResp.ID
	token = regResp.Token
	log.Printf("[E.S.C.A.P.E.] Symbiosis established. Node ID: %s", nodeID)
}

func heartbeatLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		reqData := HeartbeatRequest{ISP: isp}
		jsonData, _ := json.Marshal(reqData)

		url := fmt.Sprintf("%s/api/v1/nodes/%s/heartbeat", C2_URL, nodeID)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("[E.S.C.A.P.E.] Heartbeat failed: %v", err)
			continue
		}

		var hbResp HeartbeatResponse
		if err := json.NewDecoder(resp.Body).Decode(&hbResp); err != nil {
			log.Printf("[E.S.C.A.P.E.] Failed to decode heartbeat response: %v", err)
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		if hbResp.Task != nil {
			go handleTask(hbResp.Task)
		}
	}
}

func handleTask(task *Task) {
	log.Printf("[E.S.C.A.P.E.] Received Directive: %s -> %s", task.Type, task.Target)
	log.Printf("[E.S.C.A.P.E.] Applying Strategy [%s]: %s", task.Strategy, task.Params)

	// Симуляция работы (В реальности здесь будет вызов Rust FFI для обхода DPI)
	startTime := time.Now()
	time.Sleep(time.Duration(rand.Intn(2000)+500) * time.Millisecond)
	latency := time.Since(startTime).Milliseconds()
	
	// Симуляция успешности
	success := rand.Float32() > 0.1 // 90% success

	log.Printf("[E.S.C.A.P.E.] Directive complete. Success: %v, Latency: %dms", success, latency)

	// Отправка телеметрии (Waggle Dance)
	reqData := TaskCompleteRequest{
		Success:   success,
		LatencyMs: latency,
	}
	jsonData, _ := json.Marshal(reqData)

	url := fmt.Sprintf("%s/api/v1/nodes/%s/tasks/%s/complete", C2_URL, nodeID, task.ID)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[E.S.C.A.P.E.] Failed to report task completion: %v", err)
		return
	}
	defer resp.Body.Close()
}

func startSocks5Proxy() {
	// Создаем SOCKS5 сервер с конфигурацией по умолчанию
	conf := &socks5.Config{}
	server, err := socks5.New(conf)
	if err != nil {
		log.Fatalf("Failed to create SOCKS5 server: %v", err)
	}

	addr := "127.0.0.1:1080"
	log.Printf("[E.S.C.A.P.E.] Local SOCKS5 Proxy listening on %s", addr)
	
	// В будущем мы перехватим функцию Dial у SOCKS5 сервера,
	// чтобы направлять трафик через Rust Engine для модификации пакетов.
	
	if err := server.ListenAndServe("tcp", addr); err != nil {
		log.Fatalf("Failed to start SOCKS5 server: %v", err)
	}
}
