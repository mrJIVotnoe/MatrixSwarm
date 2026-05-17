import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer } from "http";

import { getDb } from "./src/db.js";
import { state } from "./src/server/state.js";
import { MatrixService } from "./src/services/matrixService.js";
import { startBackgroundSweep } from "./src/server/services/orchestratorService.js";
import apiRouter from "./src/server/routes/api.js";

const COMM_DIR = path.join(process.cwd(), "comm");
if (!fs.existsSync(COMM_DIR)) {
  fs.mkdirSync(COMM_DIR, { recursive: true });
}

// Matrix Service Initialization
if (process.env.MATRIX_BASE_URL && process.env.MATRIX_ACCESS_TOKEN && process.env.MATRIX_ROOM_ID) {
  state.matrixEcho = new MatrixService(
    process.env.MATRIX_BASE_URL,
    process.env.MATRIX_ACCESS_TOKEN,
    process.env.MATRIX_ROOM_ID,
    process.env.MATRIX_USER_ID,
    process.env.SWARM_ENCRYPTION_KEY
  );
  state.matrixEcho.start().catch((err: any) => console.error("[ERROR] [HIVE] Matrix Echo failed to start:", err));
} else {
  console.warn("[WARN] [HIVE] Matrix credentials missing. The Echo protocol will be simulated locally.");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // Init DB
  try {
    await getDb();
  } catch (e: any) {
    console.error("[WARNING] Database failed to initialize. Swarm operating in ephemeral memory Mode! Error:", e.message);
  }

  // WebSockets Removed for Final L3 Native Gossip Only Protocol

  // Background Sweep
  startBackgroundSweep();

  // API Routes
  app.use("/api/v1", apiRouter);

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.info(`[INFO] [SWARM CORE] Server running on port ${PORT}`);
  }).on("error", (err: any) => {
    console.error("[ERROR] [SWARM CORE] Server failed to start:", err);
  });
}

startServer().catch((err) => {
  console.error("[ERROR] [SWARM CORE] Fatal error during startup:", err);
});
