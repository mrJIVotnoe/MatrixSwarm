const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace sqlite3 with better-sqlite3
code = code.replace(/import sqlite3 from 'sqlite3';\nimport \{ open \} from 'sqlite';/g, "import Database from 'better-sqlite3';");

// Update initDb
const newInitDb = `
// Initialize SQLite
let db: any;
function initDb() {
  db = new Database('./database.sqlite');
  
  db.pragma('journal_mode = WAL');

  db.exec(\`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      address TEXT,
      capabilities TEXT,
      ram_mb INTEGER,
      cpu_cores INTEGER,
      ai_capable BOOLEAN,
      ai_tier TEXT,
      load REAL,
      status TEXT,
      last_heartbeat INTEGER,
      temperature REAL,
      token TEXT,
      trust_score INTEGER,
      privacy_mode TEXT,
      benchmark_cpu_score REAL,
      benchmark_ram_score REAL,
      benchmark_is_vm BOOLEAN,
      benchmark_verified_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT,
      payload TEXT,
      priority INTEGER,
      status TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      assigned_node TEXT,
      result TEXT,
      error TEXT,
      attempts INTEGER
    );
  \`);
}
`;

code = code.replace(/\/\/ Initialize SQLite[\s\S]*?initDb\(\);/g, newInitDb + 'initDb();');

// Replace all async db calls with sync better-sqlite3 calls
code = code.replace(/await getDocs\(query\(collection\(db, "nodes"\), where\("status", "!=", "offline"\), where\("last_heartbeat", "<", thirtySecondsAgo\)\)\)/g, 'db.prepare("SELECT * FROM nodes WHERE status != ? AND last_heartbeat < ?").all("offline", thirtySecondsAgo.toMillis())');
code = code.replace(/const batch = writeBatch\(db\);\n\s*staleNodes\.forEach\(doc => \{\n\s*const data = doc\.data\(\) as Node;\n\s*\/\/ Decrease trust score for unexpected offline\n\s*const newTrustScore = Math\.max\(0, \(data\.trust_score \|\| 50\) - 5\);\n\s*batch\.update\(doc\.ref, \{ \n\s*status: "offline",\n\s*trust_score: newTrustScore\n\s*\}\);\n\s*\}\);\n\s*await batch\.commit\(\);/g, `const updateStmt = db.prepare("UPDATE nodes SET status = ?, trust_score = ? WHERE id = ?");
    const transaction = db.transaction((nodes) => {
      for (const node of nodes) {
        const newTrustScore = Math.max(0, (node.trust_score || 50) - 5);
        updateStmt.run("offline", newTrustScore, node.id);
      }
    });
    transaction(staleNodes);`);

code = code.replace(/await getDocs\(query\(collection\(db, "nodes"\), where\("last_heartbeat", "<", Timestamp\.fromMillis\(now\.toMillis\(\) - 3600000\)\)\)\)/g, 'db.prepare("SELECT * FROM nodes WHERE last_heartbeat < ?").all(now.toMillis() - 3600000)');
code = code.replace(/const deleteBatch = writeBatch\(db\);\n\s*veryOldNodes\.forEach\(doc => \{\n\s*deleteBatch\.delete\(doc\.ref\);\n\s*\}\);\n\s*await deleteBatch\.commit\(\);/g, `const deleteStmt = db.prepare("DELETE FROM nodes WHERE id = ?");
    const deleteTransaction = db.transaction((nodes) => {
      for (const node of nodes) {
        deleteStmt.run(node.id);
      }
    });
    deleteTransaction(veryOldNodes);`);

code = code.replace(/await getDocs\(query\(collection\(db, "tasks"\), where\("status", "==", "running"\), where\("updated_at", "<", twoMinutesAgo\)\)\)/g, 'db.prepare("SELECT * FROM tasks WHERE status = ? AND updated_at < ?").all("running", twoMinutesAgo.toMillis())');
code = code.replace(/const taskBatch = writeBatch\(db\);\n\s*stuckTasks\.forEach\(doc => \{\n\s*taskBatch\.update\(doc\.ref, \{ \n\s*status: "pending",\n\s*assigned_node: null,\n\s*attempts: increment\(1\)\n\s*\}\);\n\s*\}\);\n\s*await taskBatch\.commit\(\);/g, `const updateTaskStmt = db.prepare("UPDATE tasks SET status = ?, assigned_node = NULL, attempts = attempts + 1 WHERE id = ?");
    const taskTransaction = db.transaction((tasks) => {
      for (const task of tasks) {
        updateTaskStmt.run("pending", task.id);
      }
    });
    taskTransaction(stuckTasks);`);

code = code.replace(/await getDocs\(query\(collection\(db, "tasks"\), where\("status", "in", \["completed", "failed"\]\), where\("created_at", "<", fiveMinutesAgo\)\)\)/g, 'db.prepare("SELECT * FROM tasks WHERE status IN (?, ?) AND created_at < ?").all("completed", "failed", fiveMinutesAgo.toMillis())');
code = code.replace(/const pruneBatch = writeBatch\(db\);\n\s*oldTasks\.forEach\(doc => \{\n\s*pruneBatch\.delete\(doc\.ref\);\n\s*\}\);\n\s*await pruneBatch\.commit\(\);/g, `const pruneStmt = db.prepare("DELETE FROM tasks WHERE id = ?");
    const pruneTransaction = db.transaction((tasks) => {
      for (const task of tasks) {
        pruneStmt.run(task.id);
      }
    });
    pruneTransaction(oldTasks);`);

code = code.replace(/await getDocs\(collection\(db, "tasks"\)\)/g, 'db.prepare("SELECT * FROM tasks").all()');
code = code.replace(/await getDocs\(collection\(db, "nodes"\)\)/g, 'db.prepare("SELECT * FROM nodes").all()');
code = code.replace(/tasksSnapshot\.docs\.forEach\(doc => \{\n\s*const data = doc\.data\(\) as Task;\n\s*stats\.totalTasks\+\+;\n\s*if \(data\.status === "pending"\) stats\.pendingTasks\+\+;\n\s*if \(data\.status === "running"\) stats\.runningTasks\+\+;\n\s*if \(data\.status === "completed"\) stats\.completedTasks\+\+;\n\s*if \(data\.status === "failed"\) stats\.failedTasks\+\+;\n\s*\}\);/g, `tasksSnapshot.forEach(data => {
      stats.totalTasks++;
      if (data.status === "pending") stats.pendingTasks++;
      if (data.status === "running") stats.runningTasks++;
      if (data.status === "completed") stats.completedTasks++;
      if (data.status === "failed") stats.failedTasks++;
    });`);
code = code.replace(/nodesSnapshot\.docs\.forEach\(doc => \{\n\s*const data = doc\.data\(\) as Node;\n\s*stats\.totalNodes\+\+;\n\s*if \(data\.status === "online"\) stats\.onlineNodes\+\+;\n\s*if \(data\.status === "overheated"\) stats\.overheatedNodes\+\+;\n\s*if \(data\.ai_tier\) \{\n\s*stats\.nodesByAiTier\[data\.ai_tier\] = \(stats\.nodesByAiTier\[data\.ai_tier\] \|\| 0\) \+ 1;\n\s*\}\n\s*\}\);/g, `nodesSnapshot.forEach(data => {
      stats.totalNodes++;
      if (data.status === "online") stats.onlineNodes++;
      if (data.status === "overheated") stats.overheatedNodes++;
      if (data.ai_tier) {
        stats.nodesByAiTier[data.ai_tier] = (stats.nodesByAiTier[data.ai_tier] || 0) + 1;
      }
    });`);

code = code.replace(/await getDoc\(doc\(db, "nodes", nodeId\)\)/g, 'db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId)');
code = code.replace(/if \(!nodeDoc\.exists\(\)\)/g, 'if (!nodeDoc)');
code = code.replace(/const nodeData = nodeDoc\.data\(\) as Node;/g, 'const nodeData = nodeDoc as Node;');

code = code.replace(/await setDoc\(doc\(db, "tasks", taskId\), \{\n\s*id: taskId,\n\s*type: req\.body\.type,\n\s*payload: req\.body\.payload,\n\s*priority: req\.body\.priority \|\| 1,\n\s*status: "pending",\n\s*created_at: Timestamp\.now\(\),\n\s*updated_at: Timestamp\.now\(\),\n\s*assigned_node: null,\n\s*result: null,\n\s*error: null,\n\s*attempts: 0\n\s*\}\);/g, `db.prepare("INSERT INTO tasks (id, type, payload, priority, status, created_at, updated_at, assigned_node, result, error, attempts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        taskId, req.body.type, JSON.stringify(req.body.payload), req.body.priority || 1, "pending", Date.now(), Date.now(), null, null, null, 0
      );`);

code = code.replace(/await getDoc\(doc\(db, "tasks", req\.params\.taskId\)\)/g, 'db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.taskId)');
code = code.replace(/if \(!doc\.exists\(\)\)/g, 'if (!doc)');
code = code.replace(/res\.json\(doc\.data\(\)\);/g, 'res.json({...doc, payload: JSON.parse(doc.payload || "null"), result: JSON.parse(doc.result || "null")});');

code = code.replace(/await setDoc\(doc\(db, "nodes", id\), \{\n\s*id,\n\s*address: req\.ip \|\| req\.socket\.remoteAddress \|\| "unknown",\n\s*capabilities: req\.body\.capabilities \|\| \[\],\n\s*ram_mb: req\.body\.ram_mb \|\| 1024,\n\s*cpu_cores: req\.body\.cpu_cores \|\| 2,\n\s*ai_capable: req\.body\.ai_capable \|\| false,\n\s*ai_tier: req\.body\.ai_tier \|\| "none",\n\s*load: req\.body\.load \|\| 0,\n\s*status: "online",\n\s*last_heartbeat: Timestamp\.now\(\),\n\s*temperature: req\.body\.temperature \|\| 40,\n\s*token,\n\s*trust_score: 50, \/\/ Initial trust score\n\s*privacy_mode: req\.body\.privacy_mode \|\| "public"\n\s*\}\);/g, `db.prepare("INSERT INTO nodes (id, address, capabilities, ram_mb, cpu_cores, ai_capable, ai_tier, load, status, last_heartbeat, temperature, token, trust_score, privacy_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, req.ip || req.socket.remoteAddress || "unknown", JSON.stringify(req.body.capabilities || []), req.body.ram_mb || 1024, req.body.cpu_cores || 2, req.body.ai_capable ? 1 : 0, req.body.ai_tier || "none", req.body.load || 0, "online", Date.now(), req.body.temperature || 40, token, 50, req.body.privacy_mode || "public"
      );`);

code = code.replace(/await updateDoc\(doc\(db, "nodes", req\.params\.nodeId\), \{\n\s*last_heartbeat: Timestamp\.now\(\),\n\s*load: req\.body\.load,\n\s*temperature: req\.body\.temperature,\n\s*status: req\.body\.status \|\| "online"\n\s*\}\);/g, `db.prepare("UPDATE nodes SET last_heartbeat = ?, load = ?, temperature = ?, status = ? WHERE id = ?").run(
        Date.now(), req.body.load, req.body.temperature, req.body.status || "online", req.params.nodeId
      );`);

code = code.replace(/const docRef = doc\(db, "nodes", req\.params\.nodeId\);\n\s*const nodeDoc = await getDoc\(docRef\);\n\s*if \(!nodeDoc\.exists\(\)\) \{\n\s*return res\.status\(404\)\.json\(\{ error: "Node not found" \}\);\n\s*\}\n\s*const nodeData = nodeDoc\.data\(\) as Node;\n\s*if \(nodeData\.token !== req\.body\.token\) \{\n\s*return res\.status\(401\)\.json\(\{ error: "Invalid token" \}\);\n\s*\}\n\s*await updateDoc\(docRef, \{\n\s*status: "offline",\n\s*last_heartbeat: Timestamp\.now\(\)\n\s*\}\);/g, `const nodeDoc = db.prepare("SELECT * FROM nodes WHERE id = ?").get(req.params.nodeId);
      if (!nodeDoc) {
        return res.status(404).json({ error: "Node not found" });
      }
      if (nodeDoc.token !== req.body.token) {
        return res.status(401).json({ error: "Invalid token" });
      }
      db.prepare("UPDATE nodes SET status = ?, last_heartbeat = ? WHERE id = ?").run("offline", Date.now(), req.params.nodeId);`);

code = code.replace(/await getDoc\(doc\(db, "nodes", req\.params\.nodeId\)\)/g, 'db.prepare("SELECT * FROM nodes WHERE id = ?").get(req.params.nodeId)');
code = code.replace(/await getDocs\(query\(collection\(db, "tasks"\), where\("status", "==", "pending"\)\)\)/g, 'db.prepare("SELECT * FROM tasks WHERE status = ?").all("pending")');
code = code.replace(/const tasks = tasksSnapshot\.docs\.map\(doc => doc\.data\(\) as Task\);/g, 'const tasks = tasksSnapshot;');

code = code.replace(/await updateDoc\(doc\(db, "tasks", suitableTask\.id\), \{\n\s*status: "running",\n\s*assigned_node: req\.params\.nodeId,\n\s*updated_at: Timestamp\.now\(\)\n\s*\}\);/g, `db.prepare("UPDATE tasks SET status = ?, assigned_node = ?, updated_at = ? WHERE id = ?").run(
        "running", req.params.nodeId, Date.now(), suitableTask.id
      );`);

code = code.replace(/const taskRef = doc\(db, "tasks", req\.params\.taskId\);\n\s*const taskDoc = await getDoc\(taskRef\);\n\s*if \(!taskDoc\.exists\(\)\) \{\n\s*return res\.status\(404\)\.json\(\{ error: "Task not found" \}\);\n\s*\}\n\s*const taskData = taskDoc\.data\(\) as Task;\n\s*if \(taskData\.assigned_node !== nodeId\) \{\n\s*return res\.status\(403\)\.json\(\{ error: "Task assigned to different node" \}\);\n\s*\}\n\s*await updateDoc\(taskRef, \{\n\s*status: "completed",\n\s*result: req\.body\.result,\n\s*updated_at: Timestamp\.now\(\)\n\s*\}\);\n\s*if \(nodeId\) \{\n\s*await updateDoc\(doc\(db, "nodes", nodeId\), \{\n\s*trust_score: increment\(1\)\n\s*\}\);\n\s*\}/g, `const taskDoc = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.taskId);
      if (!taskDoc) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (taskDoc.assigned_node !== nodeId) {
        return res.status(403).json({ error: "Task assigned to different node" });
      }
      db.prepare("UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?").run(
        "completed", JSON.stringify(req.body.result), Date.now(), req.params.taskId
      );
      if (nodeId) {
        db.prepare("UPDATE nodes SET trust_score = trust_score + 1 WHERE id = ?").run(nodeId);
      }`);

code = code.replace(/const taskRef = doc\(db, "tasks", req\.params\.taskId\);\n\s*const taskDoc = await getDoc\(taskRef\);\n\s*if \(!taskDoc\.exists\(\)\) \{\n\s*return res\.status\(404\)\.json\(\{ error: "Task not found" \}\);\n\s*\}\n\s*const taskData = taskDoc\.data\(\) as Task;\n\s*if \(taskData\.assigned_node !== nodeId\) \{\n\s*return res\.status\(403\)\.json\(\{ error: "Task assigned to different node" \}\);\n\s*\}\n\s*await updateDoc\(taskRef, \{\n\s*status: "failed",\n\s*error: req\.body\.error,\n\s*updated_at: Timestamp\.now\(\)\n\s*\}\);\n\s*if \(nodeId\) \{\n\s*await updateDoc\(doc\(db, "nodes", nodeId\), \{\n\s*trust_score: increment\(-2\)\n\s*\}\);\n\s*\}/g, `const taskDoc = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.taskId);
      if (!taskDoc) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (taskDoc.assigned_node !== nodeId) {
        return res.status(403).json({ error: "Task assigned to different node" });
      }
      db.prepare("UPDATE tasks SET status = ?, error = ?, updated_at = ? WHERE id = ?").run(
        "failed", req.body.error, Date.now(), req.params.taskId
      );
      if (nodeId) {
        db.prepare("UPDATE nodes SET trust_score = trust_score - 2 WHERE id = ?").run(nodeId);
      }`);

code = code.replace(/await getDocs\(query\(collection\(db, "nodes"\), orderBy\("last_heartbeat", "desc"\)\)\)/g, 'db.prepare("SELECT * FROM nodes ORDER BY last_heartbeat DESC").all()');
code = code.replace(/const nodes = result\.docs\.map\(doc => doc\.data\(\)\);/g, 'const nodes = result;');

code = code.replace(/await getDocs\(query\(collection\(db, "tasks"\), orderBy\("created_at", "desc"\), limit\(10\)\)\)/g, 'db.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 10").all()');
code = code.replace(/const tasks = result\.docs\.map\(doc => doc\.data\(\)\);/g, 'const tasks = result.map(t => ({...t, payload: JSON.parse(t.payload || "null"), result: JSON.parse(t.result || "null")}));');

fs.writeFileSync('server.ts', code);
