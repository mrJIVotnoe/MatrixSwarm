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

  constructor(private onUpdate: (status: SymbioteStatus, message?: string, trustScore?: number) => void) {}

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

  public async grantConsent() {
    this.consentGranted = true;
    this.status = "connecting";
    this.onUpdate(this.status, "Согласие получено. Установка связи с Ядром Роя...");

    try {
      const res = await fetch('/api/v1/nodes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilities: ['relay', 'byedpi_routing'],
          ram_mb: this.hardwareStats.ram * 1024,
          cpu_cores: this.hardwareStats.cores,
          power_rating: this.powerRating
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
            body: JSON.stringify({ isp: this.isp })
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
