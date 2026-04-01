# Monitoring and Observability

**What**: Collecting, analyzing, and visualizing system metrics, logs, and traces to understand system behavior, diagnose issues, and ensure reliability.

**When to use**: In all production systems to detect outages, track performance, debug issues, and inform capacity planning.

**Tradeoffs**: Operational visibility and faster incident response vs. overhead of instrumentation, storage costs, and alert fatigue.

## How It Works

**Three Pillars of Observability**:

**1. Metrics** - Numerical measurements over time
```
request_count{endpoint="/api/users", status="200"} 1543
request_duration_seconds{endpoint="/api/users", quantile="0.95"} 0.234
```

**2. Logs** - Discrete events with context
```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "user_id": "12345",
  "trace_id": "abc123"
}
```

**3. Traces** - Request flow through distributed system
```
Request → API Gateway (50ms) → Auth Service (20ms) → Database (100ms)
```

**Key Metrics**:

**Latency Percentiles**:
- **P50 (median)**: Half of requests faster, half slower
- **P95**: 95% of requests faster than this
- **P99**: 99% of requests faster (captures outliers)
- **P99.9**: Critical for understanding worst-case UX

Why percentiles? Averages hide outliers. A 50ms average with a 5s P99 means some users have terrible experience.

**Error Rates**:
- 5xx errors / total requests (server issues)
- 4xx errors / total requests (client issues)
- Error budget: Allowed error rate (e.g., 99.9% uptime = 0.1% error budget)

**RED Method** (for request-driven systems):
- **Rate**: Requests per second
- **Errors**: Error rate or count
- **Duration**: Latency distribution (percentiles)

**USE Method** (for resources like CPU, memory, disk):
- **Utilization**: % time resource is busy
- **Saturation**: Queue length or waiting work
- **Errors**: Error count

## Complexity / Performance

**Instrumentation Overhead**:
- Metrics collection: 1-5% CPU overhead
- Distributed tracing: 5-10% overhead (sample 1-10% of traces)
- Structured logging: Minimal if async, can impact latency if synchronous

**Storage Costs**:
- Metrics: Cheap (aggregated, time-series compression)
- Logs: Expensive (high volume, retention policies critical)
- Traces: Moderate (sampling reduces volume)

**Query Performance**:
- Time-series DBs (Prometheus, InfluxDB): Optimized for range queries
- Log aggregation (Elasticsearch): Full-text search, can be slow on huge datasets
- Tracing (Jaeger, Tempo): Indexed by trace ID, fast lookups

**Alerting Best Practices**:
- Alert on symptoms (users affected) not causes (disk 80% full)
- Use multiple thresholds (warning vs critical)
- Avoid alert fatigue: too many alerts = ignored alerts
- Runbooks: Every alert should have clear next steps

## Real-World Examples

**Monitoring Tools**:
- **Prometheus + Grafana**: Metrics collection, time-series DB, dashboards
- **Datadog**: All-in-one APM, metrics, logs, traces
- **New Relic**: APM focused, transaction tracing
- **ELK Stack** (Elasticsearch, Logstash, Kibana): Log aggregation and search
- **Jaeger / Zipkin**: Distributed tracing
- **CloudWatch**: AWS-native monitoring
- **Sentry**: Error tracking and crash reporting

**Production Dashboards**:
```
Service Health Dashboard:
- Request rate (requests/sec)
- Error rate (% and count)
- Latency (P50, P95, P99)
- Apdex score (user satisfaction metric)
- Active users
- Database connection pool usage
```

**SLOs (Service Level Objectives)**:
- 99.9% of requests complete in < 200ms (latency SLO)
- 99.95% availability (error budget: 0.05% = ~22 min downtime/month)
- 99.99% of writes persisted without data loss

**Example Alert**:
```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status="5xx"}[5m]) > 0.05
for: 5m  # must be true for 5 minutes
severity: critical
description: "Error rate is {{ $value }}% over last 5 min"
```

## Related Concepts

- `./api-design.md` - Tracking API latency and error codes
- `./rate-limiting.md` - Monitoring rate limit hits
- `./retry-and-backoff.md` - Tracking retry rates and circuit breaker states
- `./caching.md` - Cache hit rate metrics
- `./ranking-and-scoring.md` - Monitoring search quality metrics
