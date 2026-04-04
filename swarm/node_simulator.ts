/**
 * MatrixSwarm Node Simulator (E.S.C.A.P.E. Clients)
 * This script simulates multiple nodes joining the swarm, sending heartbeats,
 * and performing tasks to populate the dashboard with data.
 */

const API_URL = "http://localhost:3000/api/v1";

const ISPS = ["Rostelecom", "MTS", "Beeline", "Megafon", "China Telecom", "IranCell"];

const NODE_TEMPLATES = [
  { name: "Pixel 4 (Legacy)", ram_mb: 3800, cpu_cores: 8, power_rating: "slm_1.5b", capabilities: ["generic", "text_classification"] },
  { name: "Galaxy S8 (Legacy)", ram_mb: 4000, cpu_cores: 8, power_rating: "slm_1.5b", capabilities: ["generic", "image_processing"] },
  { name: "ThinkPad X230", ram_mb: 8000, cpu_cores: 4, power_rating: "slm_3b", capabilities: ["generic", "llm_3b", "llm_7b"] },
  { name: "Raspberry Pi 4", ram_mb: 2000, cpu_cores: 4, power_rating: "none", capabilities: ["generic", "file_storage"] },
  { name: "iPhone 8 (Legacy)", ram_mb: 2000, cpu_cores: 6, power_rating: "none", capabilities: ["generic"] },
];

async function simulate() {
  console.log("🐝 Starting E.S.C.A.P.E. Node Simulator...");

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
  for (let i = 0; i < 12; i++) {
    const template = NODE_TEMPLATES[Math.floor(Math.random() * NODE_TEMPLATES.length)];
    const isp = ISPS[Math.floor(Math.random() * ISPS.length)];
    
    try {
      const res = await fetch(`${API_URL}/nodes/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capabilities: template.capabilities,
          ram_mb: template.ram_mb,
          cpu_cores: template.cpu_cores,
          power_rating: template.power_rating
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Registered: ${data.id} (${template.name}) on ${isp}`);
        activeNodes.push({ id: data.id, template, isp });
      }
      await new Promise(r => setTimeout(r, 500)); // Stagger registrations
    } catch (err) {
      console.error(`❌ Failed to register node`);
    }
  }

  // Heartbeat and Task Loop
  setInterval(async () => {
    for (const node of activeNodes) {
      try {
        // 1. Send Heartbeat and get task
        const hbRes = await fetch(`${API_URL}/nodes/${node.id}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isp: node.isp })
        });

        const { task } = await hbRes.json();

        if (task) {
          console.log(`🚀 Node ${node.id} picked up task: ${task.id} (${task.strategy}) for ${task.target}`);
          
          // Simulate work (The Waggle Dance)
          setTimeout(async () => {
            // Simulate success rate based on strategy and ISP (just random for now, but Commissar will learn)
            // Let's make 'fake_sni' work well on MTS and 'split_host' work well on Rostelecom
            let successProb = 0.5;
            if (node.isp === 'MTS' && task.strategy === 'fake_sni') successProb = 0.9;
            if (node.isp === 'Rostelecom' && task.strategy === 'split_host') successProb = 0.85;

            const success = Math.random() < successProb;
            const latency_ms = success ? 20 + Math.floor(Math.random() * 150) : 5000;
            
            await fetch(`${API_URL}/nodes/${node.id}/tasks/${task.id}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ success, latency_ms })
            });
            
            console.log(`🏁 Node ${node.id} ${success ? "completed" : "failed"} task: ${task.id} in ${latency_ms}ms`);
          }, 1000 + Math.random() * 2000);
        }
      } catch (err) {
        // Silent fail for simulation
      }
    }
  }, 4000);
}

simulate();
