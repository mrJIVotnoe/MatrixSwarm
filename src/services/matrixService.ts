import * as sdk from "matrix-js-sdk";
import CryptoJS from "crypto-js";

export interface EchoMessage {
  type: "echo_telemetry";
  isp: string;
  strategy: string;
  target: string;
  success: boolean;
  timestamp: number;
}

export class MatrixService {
  private client: sdk.MatrixClient | null = null;
  private roomId: string | null = null;
  private swarmKey: string | null = null;

  constructor(baseUrl: string, accessToken: string, roomId: string, userId?: string, swarmKey?: string) {
    this.client = sdk.createClient({
      baseUrl,
      accessToken,
      userId: userId || "@swarm_core:matrix.org",
    });
    this.roomId = roomId;
    this.swarmKey = swarmKey || null;
    
    if (this.swarmKey) {
      console.log("[MATRIX_ECHO] Encryption enabled via Swarm Key");
    } else {
      console.warn("[MATRIX_ECHO] Encryption DISABLED. Swarm Key missing.");
    }
  }

  private timelineHandler = (event: unknown, room: unknown, toStartOfTimeline: boolean) => {
    if (toStartOfTimeline) return;
    
    // Type-guard event and room
    const ev = event as sdk.MatrixEvent;
    const rm = room as sdk.Room;
    
    if (ev.getType && ev.getType() !== "m.room.message") return;
    if (rm.roomId && rm.roomId !== this.roomId) return;

    const content = ev.getContent ? ev.getContent() : null;
    if (content && content.msgtype === "m.text" && content.body && typeof content.body === 'string' && content.body.startsWith("ECHO_V2:")) {
      try {
        const encryptedData = content.body.substring(8);
        const decryptedData = this.decrypt(encryptedData);
        if (!decryptedData) return;

        const data = JSON.parse(decryptedData);
        console.log("[MATRIX_ECHO] Received encrypted telemetry:", data);
      } catch (e: unknown) {
        console.error("[MATRIX_ECHO] Failed to parse decrypted echo message");
      }
    }
  };

  private getDerivedKey() {
    // PBKDF2 Key Derivation Upgrade
    return CryptoJS.PBKDF2(this.swarmKey || "", "swarm_salt_v1", { keySize: 256 / 32, iterations: 10000 });
  }

  private encrypt(text: string): string {
    if (!this.swarmKey) return text;
    const key = this.getDerivedKey();
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, key, { iv: iv });
    
    // Add HMAC for Source Validation
    const ciphertext = encrypted.toString();
    const hmac = CryptoJS.HmacSHA256(iv.toString() + ":" + ciphertext, key).toString();
    
    // Format: iv_hex:ciphertext_base64:hmac_hex
    return iv.toString() + ":" + ciphertext + ":" + hmac;
  }

  private decrypt(ciphertextWithIv: string): string {
    if (!this.swarmKey) return ciphertextWithIv;
    try {
      const parts = ciphertextWithIv.split(":");
      if (parts.length !== 3) return "";
      
      const ivStr = parts[0];
      const ciphertext = parts[1];
      const providedHmac = parts[2];
      const key = this.getDerivedKey();
      
      // Verify signature (Source Validation)
      const expectedHmac = CryptoJS.HmacSHA256(ivStr + ":" + ciphertext, key).toString();
      if (providedHmac !== expectedHmac) {
        console.error("[MATRIX_ECHO] HMAC Signature Invalid! Dropping message from unauthorized source.");
        return "";
      }

      const iv = CryptoJS.enc.Hex.parse(ivStr);
      const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e: unknown) {
      console.error("[MATRIX_ECHO] Decryption failed. Invalid Swarm Key or format?");
      return "";
    }
  }

  /**
   * Starts the Matrix client and joins the room
   */
  async start() {
    if (!this.client) return;
    
    await this.client.startClient({ initialSyncLimit: 10 });
    
    // Explicitly bind to 'Room.timeline' string avoiding `any` assertion
    // @ts-expect-error matrix-js-sdk event typing workaround
    this.client.on("Room.timeline", this.timelineHandler);

    try {
      await this.client.joinRoom(this.roomId!);
      console.log(`[MATRIX_ECHO] Joined room ${this.roomId}`);
    } catch (e: unknown) {
      console.error("[MATRIX_ECHO] Failed to join room:", e);
    }
  }

  /**
   * Broadcasts telemetry to the Matrix room (The Echo)
   */
  async broadcastEcho(telemetry: EchoMessage) {
    if (!this.client || !this.roomId) return;

    try {
      const jsonString = JSON.stringify(telemetry);
      const encryptedBody = this.encrypt(jsonString);
      const body = `ECHO_V2:${encryptedBody}`;

      // @ts-expect-error matrix-js-sdk sendEvent typing workaround
      await this.client.sendEvent(this.roomId, "m.room.message", {
        msgtype: "m.text",
        body: body,
      });
    } catch (e: unknown) {
      console.error("[MATRIX_ECHO] Failed to broadcast echo:", e);
    }
  }

  stop() {
    if (this.client) {
      // @ts-expect-error matrix-js-sdk event typing workaround
      this.client.removeListener("Room.timeline", this.timelineHandler);
      this.client.stopClient();
    }
  }
}
