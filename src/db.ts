import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await open({
    filename: './swarm.db',
    driver: sqlite3.Database
  });

  await initDb(dbInstance);
  return dbInstance;
}

async function initDb(db: Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      address TEXT,
      capabilities TEXT,
      ram_mb INTEGER,
      cpu_cores INTEGER,
      power_rating TEXT,
      status TEXT,
      last_heartbeat INTEGER,
      trust_score INTEGER,
      token TEXT
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      params TEXT
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id TEXT PRIMARY KEY,
      node_id TEXT,
      strategy_name TEXT,
      target TEXT,
      success INTEGER,
      latency_ms INTEGER,
      timestamp INTEGER,
      isp TEXT
    );
  `);

  // Seed initial strategies if empty
  const count = await db.get('SELECT COUNT(*) as count FROM strategies');
  if (count.count === 0) {
    const initialStrategies = [
      { name: "split_host", params: "--split 1+s --auto=torst --drop-sack --no-domain --cache-ttl 1500" },
      { name: "fake_sni", params: "--fake -1 --ttl 8 --tfo --no-domain" },
      { name: "disorder_oob", params: "--disorder 3 --split 2+s --tlsrec 1+s --fake -1 --ttl 6 --auto=torst,redirect --tfo --cache-ttl 3600 --mod-http hcsmix --drop-sack --tls-sni tracker.opentrackr.org --timeout 5 --no-domain --def-ttl 8" },
      { name: "udp_fake", params: "--proto=udp --pf=443 --tls-sni=www.youtube.com --fake-data=':\\xC2\\x00\\x00\\x00\\x01\\x14\\x2E\\xE3\\xE3\\x5F...' --udp-fake=25 --auto=torst --split=3 --oob=5 --tlsrec=2+s --disorder=2 --cache-ttl=7200 --timeout=10 --mod-http=hcsmix --tfo --no-domain --fake=-1 --ttl=8" },
      { name: "tls_record_fragmentation", params: "--tlsrec 1 --oob 3 --timeout 7 --no-domain" },
      { name: "http_mix", params: "-s1 -q1 -Y -Ar -s5 -o1+s -At -f-1 -r1+s -As -s1 -o1+s -s-1 -An" }
    ];

    for (const strat of initialStrategies) {
      await db.run(
        'INSERT INTO strategies (id, name, params) VALUES (?, ?, ?)',
        [crypto.randomUUID(), strat.name, strat.params]
      );
    }
  }
}
