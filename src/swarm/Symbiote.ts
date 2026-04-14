import SHA256 from 'crypto-js/sha256';

export type SymbioteStatus = 
  | "sleeping" 
  | "evaluating" 
  | "awaiting_consent" 
  | "connecting" 
  | "connected" 
  | "connection_failed";

export class SwarmSymbiote {
  public consentGranted: boolean = false;
  public powerRating: string = "unknown";
  public status: SymbioteStatus = "sleeping";
  public nodeId: string | null = null;
  public hardwareStats = { cores: 1, ram: 2 };
  public trustScore: number = 50;
  public isp: string = "BrowserISP"; // Simulated ISP for web clients
  public senses = {
    vision: false,
    hearing: false,
    proprioception: false,
    touch: false
  };

  constructor(private onUpdate: (status: SymbioteStatus, message?: string, trustScore?: number) => void) {
    this.initSenses();
  }

  private initSenses() {
    // Vision (Screen visibility)
    this.senses.vision = !document.hidden;
    document.addEventListener("visibilitychange", () => {
      this.senses.vision = !document.hidden;
    });

    // Proprioception (Orientation)
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", (event) => {
        if (event.alpha !== null) this.senses.proprioception = true;
      }, { once: true });
    }

    // Touch (Vibration API availability)
    if ('vibrate' in navigator) {
      this.senses.touch = true;
    }

    // Hearing (Microphone permission check - non-blocking)
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const hasMic = devices.some(d => d.kind === 'audioinput');
      this.senses.hearing = hasMic;
    }).catch(() => {});
  }

  private evaluateHardware(): string {
    const cores = navigator.hardwareConcurrency || 1;
    const ram = (navigator as any).deviceMemory || 2; 
    
    this.hardwareStats = { cores, ram };

    if (cores >= 8 && ram >= 8) return "llm_capable (Heavy)";
    if (cores >= 4 && ram >= 4) return "slm_capable (Medium)";
    return "router_node (Light)";
  }

  public async ignite() {
    this.status = "evaluating";
    this.onUpdate(this.status, "Анализ аппаратных мощностей...");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.powerRating = this.evaluateHardware();

    this.status = "awaiting_consent";
    this.onUpdate(this.status, `Оценка завершена: ${this.powerRating}. Ожидание согласия Гражданина.`);
  }

  public async grantConsent(delegatedTo?: string | null) {
    this.consentGranted = true;
    this.status = "connecting";
    this.onUpdate(this.status, "Согласие получено. Установка связи с Ядром Роя...");

    // Generate Manifest of Armament based on hardware
    let storage_gb = 0;
    if ('storage' in navigator && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storage_gb = estimate.quota ? Math.round(estimate.quota / (1024 * 1024 * 1024)) : 0;
      } catch (e) { /* ignore */ }
    }

    let battery_health = "unknown";
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        battery_health = battery.level > 0.2 ? "good" : "low";
      } catch (e) { /* ignore */ }
    }

    const sensors = [];
    if ('geolocation' in navigator) sensors.push('gps');
    if ('bluetooth' in navigator) sensors.push('bluetooth');
    if ('mediaDevices' in navigator) sensors.push('microphone', 'camera');

    const effectors = [];
    effectors.push('screen');
    // Flashlight is usually accessed via mediaDevices track constraints

    const manifest = {
      storage_gb,
      battery_health,
      sensors,
      effectors
    };

    try {
      const res = await fetch('/api/v1/nodes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilities: ['relay', 'byedpi_routing'],
          ram_mb: this.hardwareStats.ram * 1024,
          cpu_cores: this.hardwareStats.cores,
          power_rating: this.powerRating,
          delegatedTo: delegatedTo,
          manifest: manifest
        })
      });

      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();
      this.nodeId = data.id;
      
      this.status = "connected";
      this.onUpdate(this.status, `Симбиоз успешен. Узел [${this.nodeId.substring(0,8)}] в сети.`);
      
      this.startHeartbeat();

    } catch (e) {
      this.status = "connection_failed";
      this.onUpdate(this.status, "Ошибка связи с Ядром. Рой недоступен.");
    }
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (this.nodeId && this.status === "connected") {
        try {
          const res = await fetch(`/api/v1/nodes/${this.nodeId}/heartbeat`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isp: this.isp, senses: this.senses })
          });
          const data = await res.json();
          
          if (data.trust_score !== undefined) {
            this.trustScore = data.trust_score;
            this.onUpdate(this.status, undefined, this.trustScore);
          }

          if (data.task) {
            this.handleTask(data.task);
          }
        } catch (e) {
          console.warn("Heartbeat failed");
        }
      }
    }, 5000);
  }

  private async handleTask(task: any) {
    if (task.type === "store_akashic_shard") {
      this.onUpdate(this.status, `[AKASHIC] Получен фрагмент данных для хранения (Shard ${task.shard_index})`);
      
      // Store in local storage to simulate ROM usage
      try {
        localStorage.setItem(`akashic_${task.shard_id}`, task.data);
        this.onUpdate(this.status, `[AKASHIC] Фрагмент успешно сохранен в ПЗУ.`);
        
        // Report success
        await fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, latency_ms: 50 })
        });
      } catch (e) {
        this.onUpdate(this.status, `[AKASHIC] Ошибка записи в ПЗУ.`);
      }
      return;
    }

    if (task.type === "compute_hash") {
      this.onUpdate(this.status, `[COMPUTE] Вычислительная задача (Сложность: ${task.difficulty})`);
      const startTime = Date.now();
      let nonce = 0;
      const prefix = "0".repeat(task.difficulty);
      
      const computeChunk = async () => {
        // Process in chunks to avoid freezing the main thread
        for (let i = 0; i < 5000; i++) {
          const hash = SHA256(task.seed + nonce).toString();
          if (hash.startsWith(prefix)) {
            const latency = Date.now() - startTime;
            this.onUpdate(this.status, `[COMPUTE] Решение найдено! Nonce: ${nonce}. Время: ${latency}ms`);
            
            try {
              await fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, latency_ms: latency, result: hash })
              });
            } catch (e) {
              console.error("Failed to report compute task completion");
            }
            return;
          }
          nonce++;
        }
        // Yield to event loop and continue
        setTimeout(computeChunk, 0);
      };
      
      computeChunk();
      return;
    }

    if (task.type === "spatial_recon") {
      this.onUpdate(this.status, `[RECON] Сканирование сектора ${task.cell_id} (Обратный StarLink)...`);
      const startTime = Date.now();
      
      // Simulate geospatial reconnaissance (pinging local infrastructure to map censorship)
      setTimeout(() => {
        const latency = Date.now() - startTime;
        this.onUpdate(this.status, `[RECON] Сектор ${task.cell_id} нанесен на карту. Данные отправлены в Улей.`);
        fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, latency_ms: latency })
        }).catch(e => console.error("Failed to report recon completion"));
      }, 2000);
      return;
    }

    if (task.type === "cluster_chunk") {
      this.onUpdate(this.status, `[CLUSTER] Выполнение части распределенной задачи: ${task.start} - ${task.end}`);
      const startTime = Date.now();

      if (task.job_type === "prime_search") {
        const computePrimes = async () => {
          let count = 0;
          // Simple prime check
          const isPrime = (n: number) => {
            if (n < 2) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
              if (n % i === 0) return false;
            }
            return true;
          };

          // Non-blocking loop
          let current = task.start;
          const processBatch = () => {
            const batchEnd = Math.min(current + 5000, task.end);
            for (; current < batchEnd; current++) {
              if (isPrime(current)) count++;
            }
            if (current < task.end) {
              setTimeout(processBatch, 0);
            } else {
              const latency = Date.now() - startTime;
              this.onUpdate(this.status, `[CLUSTER] Фрагмент завершен. Найдено простых чисел: ${count}. Время: ${latency}ms`);
              fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, latency_ms: latency, result: count })
              });
            }
          };
          processBatch();
        };
        computePrimes();
      }
      return;
    }

    this.onUpdate(this.status, `[BYEDPI] Получена задача: ${task.target}`);
    
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log the advanced strategy parameters
    this.onUpdate(this.status, `[BYEDPI] Применение стратегии [${task.strategy}]:`);
    this.onUpdate(this.status, `> ${task.params}`);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    const latency_ms = Date.now() - startTime;
    const success = Math.random() > 0.1; // 90% success rate for browser node
    
    try {
      const res = await fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success, latency_ms })
      });
      const data = await res.json();
      
      if (data.trust_score !== undefined) {
        this.trustScore = data.trust_score;
      }
      
      if (success) {
        this.onUpdate(this.status, `[BYEDPI] Обход успешен (${latency_ms}ms). Репутация повышена: ${this.trustScore}`, this.trustScore);
      } else {
        this.onUpdate(this.status, `[BYEDPI] Обход не удался. Репутация понижена: ${this.trustScore}`, this.trustScore);
      }
    } catch (e) {
      this.onUpdate(this.status, `[BYEDPI] Ошибка при отправке отчета о выполнении задачи.`);
    }
  }
}
