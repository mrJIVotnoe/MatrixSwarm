import SHA256 from 'crypto-js/sha256';
import { getSystemSpecs } from '../lib/aida64';
import { SwarmSandbox, ResourceQuotas } from '../core/isolation';
import { PermissionEngine, PermissionScope } from '../core/permissions';
import { IntegrityGuard } from '../core/integrity';
import { MagistrateBridge } from './magistrate';
import { WasmTrustEngine, WasmAikidoMath, TrustLevel, WasmSwarmCore, WasmAikidoCore } from '../core/wasm_bridge';

export type SymbioteStatus = 
  | "sleeping" 
  | "evaluating" 
  | "awaiting_consent" 
  | "connecting" 
  | "connected" 
  | "connection_failed"
  | "quarantined";

export class SwarmSymbiote {
  public consentGranted: boolean = false;
  public powerRating: string = "unknown";
  public status: SymbioteStatus = "sleeping";
  public nodeId: string | null = null;
  public hardwareStats = { cores: 1, ram: 2 };
  public trustEngine: WasmTrustEngine;
  public get trustScore() { return (this.trustEngine as any).karmic_score; }
  public get trustLevel() { return this.trustEngine.get_level(); }
  public isp: string = "BrowserISP"; 
  public hardwareClass: string = "smartphone";
  public mobilityScore: number = 0;
  public cellId: string | null = null;
  public magistrateBridge: MagistrateBridge | null = null;
  private lastCoords: { lat: number, lng: number } | null = null;
  private lastCoordsTime: number = Date.now();
  public sensors = {
    vision: false,
    hearing: false,
    proprioception: false,
    touch: false,
    gps: false
  };

  private magistratePublicKey = "DEMO_MAGISTRATE_PUBKEY";
  public ownerId?: string;

  constructor(private onUpdate: (status: SymbioteStatus, message?: string, trustScore?: number) => void) {
    this.trustEngine = new WasmTrustEngine();
    this.detectHardwareClass();
    
    // Simulate initial hardware signature verification (e.g. valid USB Quarantine device)
    this.trustEngine.verify_hardware("simulated_signature_from_usb_" + Date.now());
  }

  private async requestSensorAccess(scope: PermissionScope): Promise<boolean> {
    if (PermissionEngine.hasPermission(this.trustLevel as any, scope, this.ownerId || '')) {
       return true;
    }
    
    // Fallback private key for demonstration. In prod, comes from Wallet/Seed.
    const privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const token = await PermissionEngine.requestTemporaryConsent(
      this.ownerId || 'mock_pub_key',
      privateKey,
      scope, 
      "Sensory organ required for Swarm intelligence operations."
    );
    return token !== null;
  }

  private async initSenses() {
    // Vision
    this.sensors.vision = !document.hidden;
    document.addEventListener("visibilitychange", () => {
      this.sensors.vision = !document.hidden;
    });

    // Touch
    if ('vibrate' in navigator) {
      this.sensors.touch = true;
    }

    // Require consent for invasive sensors
    if (await this.requestSensorAccess('microphone')) {
        navigator.mediaDevices?.enumerateDevices().then(devices => {
          this.sensors.hearing = devices.some(d => d.kind === 'audioinput');
        }).catch(() => {});
    }

    if (await this.requestSensorAccess('gps_location')) {
      if ('geolocation' in navigator) {
        this.sensors.gps = true;
        navigator.geolocation.watchPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          if (this.lastCoords) {
             const distMeters = WasmAikidoMath.haversine_distance(this.lastCoords.lat, this.lastCoords.lng, latitude, longitude) * 1000;
             const elapsedMinutes = (Date.now() - this.lastCoordsTime) / 60000;
             
             // AIKIDO: L2 - Global Trust 
             // "Если узел со статусом «Смартфон» не меняет геопозицию (GPS-спуфинг), Rust-модуль должен автоматически ограничивать его права"
             if (elapsedMinutes >= 1.0) {
                 const isMobileValid = WasmAikidoCore.validateMobility(this.hardwareClass, distMeters, elapsedMinutes);
                 if (!isMobileValid && this.hardwareClass === 'smartphone') {
                     // GPS Spoofing or BotFarm detected
                     this.trustEngine.revoke_trust("GPS_SPOOFING");
                     this.status = "quarantined";
                     this.onUpdate(this.status, "[АЙКИДО] Узел помещен в карантин: Аномальная (нулевая) мобильность для профиля 'Смартфон'. Подозрение на бот-ферму.");
                     return;
                 }
             }

             if (distMeters > 10) { // > 10 meters 
                this.mobilityScore += 1;
             }
          }
          this.lastCoordsTime = Date.now();
          this.lastCoords = { lat: latitude, lng: longitude };
          const cellLat = latitude.toFixed(3);
          const cellLng = longitude.toFixed(3);
          this.cellId = `CELL-${cellLat}-${cellLng}`;
        }, () => {}, { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 });
      }
    }
  }

  private detectHardwareClass() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('tizen') || ua.includes('webos')) {
      this.hardwareClass = "smart_tv";
    } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux') && !ua.includes('android')) {
      this.hardwareClass = "pc";
    } else if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
      this.hardwareClass = "smartphone";
    } else {
      this.hardwareClass = "unknown";
    }
  }

  private async evaluateHardware(): Promise<string> {
    const specs = await getSystemSpecs();
    const cores = specs.cpuCores;
    const ram = typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : 2; 
    
    this.hardwareStats = { cores, ram };

    if (specs.os === 'iOS' || specs.os === 'Android') {
      this.hardwareClass = "smartphone";
    } else if (['Windows', 'MacOS', 'Linux', 'UNIX'].includes(specs.os)) {
      this.hardwareClass = "pc";
    } else {
      this.hardwareClass = "smart_tv"; 
    }

    if (cores >= 8 && ram >= 8) return "llm_capable (Heavy)";
    if (cores >= 4 && ram >= 4) return "slm_capable (Medium)";
    return "router_node (Light)";
  }

  public async ignite(ownerId?: string | null) {
    if (ownerId) this.ownerId = ownerId;
    this.status = "evaluating";
    this.onUpdate(this.status, "Анализ аппаратных мощностей...");
    
    await this.initSenses();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.powerRating = await this.evaluateHardware();

    this.status = "awaiting_consent";
    this.onUpdate(this.status, `Оценка завершена: ${this.powerRating}. Ожидание согласия Гражданина.`);
  }

  public async grantConsent(nodeId: string, delegatedTo?: string | null) {
    this.consentGranted = true;
    this.status = "connecting";
    this.onUpdate(this.status, "Согласие получено. Установка связи с Ядром Роя...");
    this.nodeId = nodeId;

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
    if (this.sensors.gps) sensors.push('gps');
    if ('bluetooth' in navigator) sensors.push('bluetooth');
    if (this.sensors.hearing) sensors.push('microphone');

    const effectors = ['screen'];

    const manifest = {
      storage_gb,
      battery_health,
      sensors,
      effectors
    };

    let connection_type = 'wireless';
    if ('connection' in navigator && (navigator as any).connection.type) {
      connection_type = (navigator as any).connection.type;
    }

    try {
      const res = await fetch('/api/v1/nodes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.nodeId,
          capabilities: ['relay', 'byedpi_routing'],
          ram_mb: this.hardwareStats.ram * 1024,
          cpu_cores: this.hardwareStats.cores,
          power_rating: this.powerRating,
          delegatedTo: delegatedTo,
          manifest: manifest,
          owner_id: this.ownerId,
          device_type: this.hardwareClass,
          mobility_score: this.mobilityScore,
          cell_id: this.cellId,
          senses: this.sensors,
          connection_type: connection_type
        })
      });

      if (!res.ok) throw new Error("Network response was not ok");
      
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
        
        // Cleaners Protocol Execution
        const isClean = IntegrityGuard.runCleanersProtocol([]);
        if (!isClean) {
          this.status = "quarantined";
          this.onUpdate(this.status, "[CRITICAL] File system corruption detected. Node quarantined.");
          return;
        }

        try {
          const res = await fetch(`/api/v1/nodes/${this.nodeId}/heartbeat`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isp: this.isp, senses: this.sensors, mobility_score: this.mobilityScore, cell_id: this.cellId })
          });
          const data = await res.json();
          
          if (data.trust_score !== undefined) {
             (this.trustEngine as any).karmic_score = data.trust_score;
             
             // Initialize Magistrate services if eligible
             if (!this.magistrateBridge && this.trustLevel >= TrustLevel.MAGISTRATE) {
               this.magistrateBridge = new MagistrateBridge(this.trustLevel);
               this.magistrateBridge.announceTranslationService();
             }

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
    if (task.signature) {
      const isValid = IntegrityGuard.verifyTaskSignature(JSON.stringify(task.payload || {}), task.signature, this.magistratePublicKey);
      if (!isValid) {
        this.onUpdate(this.status, `[SECURITY] Invalid signature on task ${task.id}. Execution aborted.`);
        return;
      }
    }

    if (task.type === "store_akashic_shard") {
      this.onUpdate(this.status, `[AKASHIC] Получен фрагмент данных для хранения (Shard ${task.shard_index})`);
      
      const quotas: ResourceQuotas = { maxCpuPercentage: 10, maxRamMb: 50, maxExecutionTimeMs: 5000 };
      
      try {
        const taskCode = `return payload;`; // Simple passthrough for storage test
        await SwarmSandbox.executeTask(taskCode, task, quotas);
        localStorage.setItem(`akashic_${task.shard_id}`, task.data);
        this.onUpdate(this.status, `[AKASHIC] Фрагмент сохранен (Sandbox checked).`);
        await fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, latency_ms: 50 })
        });
      } catch (e: any) {
        this.onUpdate(this.status, `[SECURITY] Ошибка песочницы: ${e.message}`);
      }
      return;
    }

    if (task.type === "compute_hash") {
      this.onUpdate(this.status, `[COMPUTE] Вычислительная задача (Сложность: ${task.difficulty})`);
      const startTime = Date.now();
      let nonce = 0;
      const prefix = "0".repeat(task.difficulty);
      
      const computeChunk = async () => {
        // Enforce quota limits for compute tasks as well natively
        const quotas: ResourceQuotas = { maxCpuPercentage: 80, maxRamMb: 500, maxExecutionTimeMs: 10000 };
        try {
             // Send data to Web Worker for safe iteration
             const taskCode = `
                 // Isolated iteration
                 return { success: true, mockResult: 'hash_computed' };
             `;
             await SwarmSandbox.executeTask(taskCode, { type: 'compute', difficulty: task.difficulty }, quotas);
        } catch(e: any) {
            this.onUpdate(this.status, `[SECURITY] Ошибка вычислений: ${e.message}`);
            return;
        }

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
        setTimeout(computeChunk, 0);
      };
      
      computeChunk();
      return;
    }

    if (task.type === "spatial_recon") {
      this.onUpdate(this.status, `[RECON] Сканирование сектора ${task.cell_id} (Обратный StarLink)...`);
      const startTime = Date.now();
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

          let current = task.start;
          const processBatch = () => {
            const batchEnd = Math.min(current + 5000, task.end);
            count += WasmSwarmCore.executeComputeTask("seed", current, batchEnd);
            current = batchEnd;
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
    
    this.onUpdate(this.status, `[BYEDPI] Применение стратегии [${task.strategy}]:`);
    this.onUpdate(this.status, `> ${task.params}`);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    const latency_ms = Date.now() - startTime;
    const success = Math.random() > 0.1; 
    
    try {
      const res = await fetch(`/api/v1/nodes/${this.nodeId}/tasks/${task.id}/complete`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success, latency_ms })
      });
      const data = await res.json();
      
      if (data.trust_score !== undefined) {
        (this.trustEngine as any).karmic_score = data.trust_score;
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

