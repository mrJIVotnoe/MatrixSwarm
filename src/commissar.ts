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
   * Magistrates get the absolute best (fastest) strategy.
   * Standard nodes get a reliable but potentially slower strategy.
   */
  static async getRecommendedStrategy(isp: string, isMagistrate: boolean = false) {
    const db = await getDb();
    
    // Group telemetry by ISP and strategy
    const stats = await db.all(`
      SELECT 
        strategy_name, 
        SUM(success) * 1.0 / COUNT(*) as success_rate,
        AVG(latency_ms) as avg_latency
      FROM telemetry
      WHERE isp = ?
      GROUP BY strategy_name
      HAVING COUNT(*) > 3
    `, [isp]);

    if (stats.length > 0) {
      // Sort by success rate first, then latency
      stats.sort((a, b) => {
        if (b.success_rate !== a.success_rate) return b.success_rate - a.success_rate;
        return a.avg_latency - b.avg_latency;
      });

      let targetStrategyName;
      if (isMagistrate) {
        // Magistrate gets the absolute #1 (fastest/best)
        targetStrategyName = stats[0].strategy_name;
      } else {
        // Standard nodes get a reliable one, but maybe not the "premium" fastest one
        // We pick the 2nd best if available, or just the best if only one good one exists
        targetStrategyName = stats.length > 1 ? stats[1].strategy_name : stats[0].strategy_name;
      }

      const strategy = await db.get('SELECT * FROM strategies WHERE name = ?', [targetStrategyName]);
      if (strategy) return strategy;
    }

    // Fallback: Pick a random strategy to explore
    const strategies = await db.all('SELECT * FROM strategies');
    return strategies[Math.floor(Math.random() * strategies.length)];
  }
}
