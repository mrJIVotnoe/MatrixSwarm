/**
 * MatrixSwarm Node Simulator
 * This script simulates multiple nodes joining the swarm, sending heartbeats,
 * and performing tasks to populate the dashboard with data.
 */

const API_URL = "http://localhost:3000/api/v1";

const NODE_TEMPLATES = [
  { name: "Pixel 4 (Legacy)", ram_mb: 3800, ai_capable: true, capabilities: ["generic", "text_classification"] },
  { name: "Galaxy S8 (Legacy)", ram_mb: 4000, ai_capable: true, capabilities: ["generic", "image_processing"] },
  { name: "ThinkPad X230", ram_mb: 8000, ai_capable: true, capabilities: ["generic", "llm_3b", "llm_7b"] },
  { name: "Raspberry Pi 4", ram_mb: 2000, ai_capable: false, capabilities: ["generic", "file_storage"] },
  { name: "iPhone 8 (Legacy)", ram_mb: 2000, ai_capable: false, capabilities: ["generic"] },
];

async function simulate() {
  console.log("🐝 Starting MatrixSwarm Node Simulator...");

  // Wait for API to be available
  let apiReady = false;
  while (!apiReady) {
    try {
      const res = await fetch(`${API_URL}/swarm/status`);
      if (res.ok) apiReady = true;
    } catch (err) {
      console.log("⏳ Waiting for Swarm API...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const activeNodes: any[] = [];

  // Register nodes with a small delay between each
  for (let i = 0; i < 8; i++) {
    const template = NODE_TEMPLATES[Math.floor(Math.random() * NODE_TEMPLATES.length)];
    const nodeId = `sim-node-${i}`;
    
    try {
      const res = await fetch(`${API_URL}/node/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_id: nodeId,
          address: `192.168.1.${100 + i}`,
          capabilities: template.capabilities,
          ram_mb: template.ram_mb,
          ai_capable: template.ai_capable
        })
      });
      
      if (res.ok) {
        console.log(`✅ Registered: ${nodeId} (${template.name})`);
        activeNodes.push({ id: nodeId, template });
      }
      await new Promise(r => setTimeout(r, 500)); // Stagger registrations
    } catch (err) {
      console.error(`❌ Failed to register ${nodeId}`);
    }
  }

  // Heartbeat and Task Loop
  setInterval(async () => {
    for (const node of activeNodes) {
      // 1. Send Heartbeat
      const load = Math.floor(Math.random() * 40);
      const temperature = 30 + Math.floor(Math.random() * 25);
      
      try {
        await fetch(`${API_URL}/node/${node.id}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ load, temperature })
        });

        // 2. Try to pick up a task
        const taskRes = await fetch(`${API_URL}/node/${node.id}/task`);
        const { task } = await taskRes.json();

        if (task) {
          console.log(`🚀 Node ${node.id} picked up task: ${task.id} (${task.type})`);
          
          // Simulate work
          setTimeout(async () => {
            const success = Math.random() > 0.1;
            const endpoint = success ? "complete" : "fail";
            
            await fetch(`${API_URL}/task/${task.id}/${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(success ? { result: "PROCESSED_SUCCESSFULLY" } : { error: "HARDWARE_TIMEOUT" })
            });
            
            console.log(`🏁 Node ${node.id} ${success ? "completed" : "failed"} task: ${task.id}`);
          }, 2000 + Math.random() * 3000);
        }
      } catch (err) {
        // Silent fail for simulation
      }
    }
  }, 3000);
}

simulate();
