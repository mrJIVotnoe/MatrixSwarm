export type SwarmCriticality = 'idle' | 'active' | 'critical' | 'quarantine';

export class AcousticSync {
  private audioCtx: AudioContext | null = null;

  public initialize() {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
  }

  public emitPheromoneBeacon() {
    if (!this.audioCtx) return;

    try {
      // 18-20 kHz ultrasonic pulse for physical proximity verification
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      // Randomize frequency slightly between 18000 and 19500 to avoid phase cancellation
      const freq = 18000 + Math.random() * 1500;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, this.audioCtx.currentTime + 0.05); // Rapid attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3); // Decay

      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      oscillator.start();
      oscillator.stop(this.audioCtx.currentTime + 0.5);
      console.log(`[AcousticSync] Emitting ultrasound beacon at ${Math.round(freq)}Hz`);
    } catch (e) {
      console.warn('[AcousticSync] Failed to emit beacon:', e);
    }
  }
}

export class KynopsisLink {
  public static setVisualState(criticality: SwarmCriticality) {
    // "Цветовой код статуса" - Light-weight DOM manipulation for immediate visual feedback
    if (typeof document === 'undefined') return;

    const overlayId = 'kynopsis-overlay';
    let overlay = document.getElementById(overlayId);
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.pointerEvents = 'none'; // Allow clicking through
      overlay.style.zIndex = '9999';
      overlay.style.transition = 'background-color 0.5s ease, opacity 0.5s ease';
      document.body.appendChild(overlay);
    }

    switch (criticality) {
      case 'idle':
        overlay.style.backgroundColor = 'transparent';
        break;
      case 'active':
        overlay.style.backgroundColor = 'rgba(6, 182, 212, 0.05)'; // Cyan
        break;
      case 'critical':
        overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; // Red
        break;
      case 'quarantine':
        overlay.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'; // Amber warning
        break;
    }
    
    console.log(`[KynopsisLink] Visual state shifted to ${criticality}`);
  }
}
