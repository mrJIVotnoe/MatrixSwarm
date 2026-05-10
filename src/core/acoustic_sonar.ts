import { WasmDSP, WasmSwarmNetwork } from './wasm_bridge';

export class AcousticCellLink {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isListening: boolean = false;
  private targetFreq: number = 19000; // 19 kHz ultrasonic beacon

  public async startListening(onPeerDetected: (peerId: string) => void) {
    if (this.isListening) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      source.connect(this.analyser);
      this.isListening = true;

      this.processAudio(onPeerDetected);
      console.log(`[ACOUSTIC_L3] Listening for Ultrasonic Beacons at ${this.targetFreq}Hz...`);
    } catch (err) {
      console.warn(`[ACOUSTIC_L3] Failed to access microphone for acoustic sensing. Node remains deaf.`);
    }
  }

  private processAudio(onPeerDetected: (peerId: string) => void) {
    if (!this.isListening || !this.analyser || !this.audioContext) return;

    const bufferLength = this.analyser.frequencyBinCount;
    // We get time-domain samples for the Rust Goertzel Algorithm
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    // Call Rust to perform highly optimized signal DSP
    const beaconStrength = WasmDSP.detectBeacon(dataArray, this.audioContext.sampleRate, this.targetFreq);

    if (beaconStrength > 0.05) { // Threshold for detection
        console.log(`[ACOUSTIC_L3] 🔥 Ultrasonic Pheromone detected! Strength: ${beaconStrength.toFixed(4)}`);
        // If a known tone sequence is detected, it represents a local node ID (simplified here)
        onPeerDetected(`ACOUSTIC_NODE_${Date.now().toString().slice(-6)}`);
    }

    requestAnimationFrame(() => this.processAudio(onPeerDetected));
  }

  public emitUltrasonicBeacon() {
    if (!this.audioContext) {
        this.audioContext = new AudioContext();
    }
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.targetFreq, this.audioContext.currentTime);
    osc.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1); // Short 100ms chirp
    console.log(`[ACOUSTIC_L3] Emitted Ultrasonic Chirp at ${this.targetFreq}Hz.`);
  }

  public stop() {
    this.isListening = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
  }
}

export const instanceAcousticLink = new AcousticCellLink();
