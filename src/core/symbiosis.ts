import { TrustLevel } from "./permissions.js";

// The User Level defines the UI complexity and security strictness
export enum UserLevel {
  CHILD = "child",   // Simplified UI, maximum safety, content filtering
  ADULT = "adult",   // Standard UI, full autonomy
  STATE = "state"    // Professional UI, traffic monitoring, advanced diagnostics
}

export class SymbiosisProtocol {
  private isOnline: boolean = navigator.onLine;
  private userLevel: UserLevel = UserLevel.ADULT;

  constructor() {
    window.addEventListener("online", this.handleConnectionChange.bind(this));
    window.addEventListener("offline", this.handleConnectionChange.bind(this));
  }

  // 1. Analyze user level (could be based on onboarding or trust)
  public setUserLevel(level: UserLevel) {
    this.userLevel = level;
    console.info(`[Symbiosis] User Observer Level adapted to: ${level.toUpperCase()}`);
  }

  public getUserLevel(): UserLevel {
    return this.userLevel;
  }

  // 2. Autonomous Provisioning (Автономное Обеспечение)
  private handleConnectionChange() {
    this.isOnline = navigator.onLine;
    if (!this.isOnline) {
      console.warn("[Symbiosis] Global connection lost. Activating Autonomous Provisioning.");
      this.activateOfflineSubsystems();
    } else {
      console.info("[Symbiosis] Global connection restored. Synergizing with the Hive.");
      this.deactivateOfflineSubsystems();
    }
  }

  private activateOfflineSubsystems() {
    // Activate local Kiwix archives and Bramble (Briar) mesh messaging
    console.info(">> [Kiwix Module] Local knowledge archives unlocked.");
    console.info(">> [Bramble Protocol] P2P Mesh communication initiated.");
  }

  private deactivateOfflineSubsystems() {
    console.info(">> [Kiwix Module] Returning to cloud-hybrid mode.");
    console.info(">> [Bramble Protocol] Matrix sync available.");
  }
}

export const symbioteCore = new SymbiosisProtocol();
