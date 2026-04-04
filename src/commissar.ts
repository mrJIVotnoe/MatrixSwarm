import { getDb } from './db';

export class Commissar {
  /**
   * Analyzes the telemetry (Waggle Dance) to find the best strategies.
   * Returns a map of ISP -> best strategy name.
   */
  static async analyzeTelemetry() {
    const db = await getDb();
    
    // Group telemetry by ISP and strategy, calculate success rate and avg latency
    const stats = await db.all(`
      SELECT 
        isp, 
        strategy_name, 
        COUNT(*) as total_attempts,
        SUM(success) as successful_attempts,
        AVG(latency_ms) as avg_latency
      FROM telemetry
      GROUP BY isp, strategy_name
      HAVING total_attempts > 5
    `);

    const bestStrategies = new Map<string, any>();

    for (const stat of stats) {
      const successRate = stat.successful_attempts / stat.total_attempts;
      
      // Score formula: success rate is paramount, lower latency is better
      // Score = (SuccessRate * 10000) - AvgLatency
      const score = (successRate * 10000) - (stat.avg_latency || 9999);

      const currentBest = bestStrategies.get(stat.isp);
      if (!currentBest || score > currentBest.score) {
        bestStrategies.set(stat.isp, {
          strategy_name: stat.strategy_name,
          successRate,
          avgLatency: stat.avg_latency,
          score
        });
      }
    }

    return bestStrategies;
  }

  /**
   * Gets the recommended strategy for a specific ISP.
   * If no data exists, returns a random strategy to gather telemetry.
   */
  static async getRecommendedStrategy(isp: string) {
    const db = await getDb();
    const bestStrategies = await this.analyzeTelemetry();
    
    const bestForIsp = bestStrategies.get(isp);
    
    if (bestForIsp && bestForIsp.successRate > 0.5) {
      // We have a good strategy for this ISP
      const strategy = await db.get('SELECT * FROM strategies WHERE name = ?', [bestForIsp.strategy_name]);
      if (strategy) return strategy;
    }

    // Fallback: Pick a random strategy to explore
    const strategies = await db.all('SELECT * FROM strategies');
    return strategies[Math.floor(Math.random() * strategies.length)];
  }
}
