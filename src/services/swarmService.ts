export interface SwarmStatus {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalNodes: number;
  onlineNodes: number;
  overheatedNodes: number;
  nodesByAiTier: {
    none: number;
    "slm_1.5b": number;
    "slm_3b": number;
    llm: number;
  };
}

export const fetchSwarmStatus = async (): Promise<SwarmStatus> => {
  try {
    const response = await fetch("/api/v1/swarm/status");
    if (!response.ok) throw new Error(`HTTP_ERROR: ${response.status}`);
    return response.json();
  } catch (err) {
    console.error("[SWARM_SERVICE] Failed to fetch status:", err);
    throw err;
  }
};

export const createTask = async (type: string, payload: any, priority: number = 5) => {
  try {
    const response = await fetch("/api/v1/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload, priority }),
    });
    if (!response.ok) throw new Error(`HTTP_ERROR: ${response.status}`);
    return response.json();
  } catch (err) {
    console.error("[SWARM_SERVICE] Failed to create task:", err);
    throw err;
  }
};

export const fetchNodes = async () => {
  try {
    const response = await fetch("/api/v1/nodes");
    if (!response.ok) throw new Error(`HTTP_ERROR: ${response.status}`);
    return response.json();
  } catch (err) {
    console.error("[SWARM_SERVICE] Failed to fetch nodes:", err);
    throw err;
  }
};

export const fetchRecentTasks = async () => {
  try {
    const response = await fetch("/api/v1/tasks/recent");
    if (!response.ok) throw new Error(`HTTP_ERROR: ${response.status}`);
    return response.json();
  } catch (err) {
    console.error("[SWARM_SERVICE] Failed to fetch recent tasks:", err);
    throw err;
  }
};
