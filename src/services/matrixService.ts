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

  private encrypt(text: string): string {
    if (!this.swarmKey) return text;
    return CryptoJS.AES.encrypt(text, this.swarmKey).toString();
  }

  private decrypt(ciphertext: string): string {
    if (!this.swarmKey) return ciphertext;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.swarmKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("[MATRIX_ECHO] Decryption failed. Invalid Swarm Key?");
      return "";
    }
  }

  /**
   * Starts the Matrix client and joins the room
   */
  async start() {
    if (!this.client) return;
    
    await this.client.startClient({ initialSyncLimit: 10 });
    
    this.client.on("Room.timeline" as any, (event: any, room: any, toStartOfTimeline: boolean) => {
      if (toStartOfTimeline) return;
      if (event.getType() !== "m.room.message") return;
      if (room.roomId !== this.roomId) return;

      const content = event.getContent();
      if (content.msgtype === "m.text" && content.body.startsWith("ECHO_V2:")) {
        try {
          const encryptedData = content.body.substring(8);
          const decryptedData = this.decrypt(encryptedData);
          if (!decryptedData) return;

          const data = JSON.parse(decryptedData);
          console.log("[MATRIX_ECHO] Received encrypted telemetry:", data);
        } catch (e) {
          console.error("[MATRIX_ECHO] Failed to parse decrypted echo message");
        }
      }
    });

    try {
      await this.client.joinRoom(this.roomId!);
      console.log(`[MATRIX_ECHO] Joined room ${this.roomId}`);
    } catch (e) {
      console.error("[MATRIX_ECHO] Failed to join room:", e);
    }
  }

  /**
   * Broadcasts telemetry to the Matrix room (The Echo)
   */
  async broadcastEcho(telemetry: EchoMessage) {
    if (!this.client || !this.roomId) return;

    const jsonString = JSON.stringify(telemetry);
    const encryptedBody = this.encrypt(jsonString);
    const body = `ECHO_V2:${encryptedBody}`;

    await (this.client as any).sendEvent(this.roomId, "m.room.message", {
      msgtype: "m.text",
      body: body,
    }, "");
  }

  stop() {
    if (this.client) {
      this.client.stopClient();
    }
  }
}
