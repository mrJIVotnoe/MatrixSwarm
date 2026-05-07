import { Router } from "express";
import authRoutes from "./auth.js";
import karmaRoutes from "./karma.js";
import taskRoutes from "./tasks.js";
import { getDb } from "../../db.js";
import { state } from "../state.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const router = Router();

// Routes
router.use("/auth", authRoutes); // Note: server.ts uses /api/v1/nodes/register vs /api/v1/observers/register
router.use("/karma", karmaRoutes);
router.use("/tasks", taskRoutes);

// For backwards compatibility with old endpoints before full refactoring
router.use("/observers", authRoutes); 
router.use("/nodes", authRoutes);

// We need to keep some endpoints in index.ts for now or move them to specialized routes
export default router;
