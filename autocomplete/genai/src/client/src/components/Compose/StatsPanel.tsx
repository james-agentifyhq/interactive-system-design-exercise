/**
 * StatsPanel — displays cost and performance metrics.
 *
 * Shows the "cost awareness" from genai.md's "Deep Dive: Cost Optimization":
 * - Tokens used (prompt + completion)
 * - Cache hit rate
 * - Last request latency
 * - Estimated cost (based on Claude Sonnet pricing)
 */

import type { CompletionStats } from '../../types';

interface StatsPanelProps {
  stats: CompletionStats;
}

// Claude Sonnet 4 pricing (approximate, per token)
const COST_PER_INPUT_TOKEN = 3.0 / 1_000_000; // $3/M input tokens
const COST_PER_OUTPUT_TOKEN = 15.0 / 1_000_000; // $15/M output tokens

export function StatsPanel({ stats }: StatsPanelProps) {
  const estimatedCost =
    stats.totalPromptTokens * COST_PER_INPUT_TOKEN +
    stats.totalCompletionTokens * COST_PER_OUTPUT_TOKEN;

  const hitRate =
    stats.totalRequests > 0
      ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(0)
      : '—';

  return (
    <div className="stats-panel">
      <div className="stats-title">Session Stats</div>
      <div className="stats-grid">
        <div className="stat">
          <span className="stat-label">Requests</span>
          <span className="stat-value">{stats.totalRequests}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cache hits</span>
          <span className="stat-value">
            {stats.cacheHits}
            {stats.totalRequests > 0 && (
              <span className="stat-secondary"> ({hitRate}%)</span>
            )}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Tokens</span>
          <span className="stat-value">
            {stats.totalPromptTokens + stats.totalCompletionTokens}
            <span className="stat-secondary">
              {' '}
              ({stats.totalPromptTokens}in + {stats.totalCompletionTokens}out)
            </span>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Est. cost</span>
          <span className="stat-value">${estimatedCost.toFixed(4)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Last latency</span>
          <span className="stat-value">
            {stats.lastLatencyMs > 0 ? `${stats.lastLatencyMs}ms` : '—'}
            {stats.lastCached && (
              <span className="stat-cached"> (cached)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
