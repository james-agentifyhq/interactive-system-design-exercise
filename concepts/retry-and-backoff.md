# Retry and Backoff

**What**: Automatically retrying failed operations with increasing delays to handle transient failures and avoid overwhelming failing services.

**When to use**: For network calls, distributed system communication, external API requests, or any operation that may fail temporarily but succeed if retried.

**Tradeoffs**: Improved reliability and fault tolerance vs. increased latency, potential duplicate operations, and resource consumption during outages.

## How It Works

**Retry Strategies**:

**1. Exponential Backoff**
- Double delay after each failure: 1s, 2s, 4s, 8s, 16s...
- Prevents overwhelming recovering service
- Spreads retry load over time
```python
def retry_with_backoff(func, max_retries=5):
    for attempt in range(max_retries):
        try:
            return func()
        except TransientError:
            if attempt == max_retries - 1:
                raise
            delay = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
            time.sleep(delay)
```

**2. Exponential Backoff with Jitter**
- Adds randomness to prevent thundering herd
- Multiple clients retry at different times
```python
delay = (2 ** attempt) + random.uniform(0, 1)
# or
delay = random.uniform(0, 2 ** attempt)  # full jitter
```

**3. Fixed Delay**
- Same delay between retries
- Simple but can cause thundering herd
- Use for low-concurrency scenarios

**Circuit Breaker Pattern**:
```
States:
CLOSED → requests pass through normally
OPEN → fail fast without calling service (after threshold failures)
HALF_OPEN → try single request to test recovery

Transitions:
CLOSED →(failures exceed threshold)→ OPEN
OPEN →(timeout expires)→ HALF_OPEN
HALF_OPEN →(request succeeds)→ CLOSED
HALF_OPEN →(request fails)→ OPEN
```

**When NOT to Retry**:
- **Non-idempotent operations**: POST creating resources (use idempotency keys instead)
- **4xx errors**: Client errors won't succeed on retry (except 429, 408)
- **Business logic failures**: Insufficient funds, validation errors
- **Already at max retries**: Fail and alert
- **User-facing requests**: Set timeout limits, show error instead of hanging

## Complexity / Performance

**Time Complexity**:
- Exponential backoff: O(2^n) total wait time for n retries
- With max backoff cap: O(n × max_delay)

**Latency Impact**:
- **Best case** (success on first try): No added latency
- **Worst case** (all retries fail): Sum of all delays
  - Example: 5 retries = 1 + 2 + 4 + 8 + 16 = 31 seconds
- **With jitter**: Average delay reduced, variance increased

**Resource Consumption**:
- Circuit breaker reduces wasted retries during outages
- Without circuit breaker: Every request retries, overwhelming system
- With circuit breaker: Fail fast after threshold, allow recovery

## Real-World Examples

- **AWS SDK**: Exponential backoff with jitter, automatic retries for transient errors
- **gRPC**: Built-in retry policy configuration, exponential backoff
- **Stripe API**: Automatic retries with idempotency keys for safe POST retries
- **Kubernetes**: Exponential backoff for pod restart policies
- **HTTP clients** (axios, fetch): Libraries like `retry-axios`, `p-retry`
- **Netflix Hystrix**: Circuit breaker library (now in maintenance mode)
- **Resilience4j**: Modern circuit breaker, rate limiter, retry library (Java)

**Production Patterns**:
```javascript
// Axios retry configuration
axios.create({
  retries: 3,
  retryDelay: (retryCount) => {
    return Math.min(1000 * (2 ** retryCount), 10000); // cap at 10s
  },
  retryCondition: (error) => {
    return error.response?.status >= 500 || error.response?.status === 429;
  }
});
```

**Idempotency for Safe Retries**:
```javascript
// POST with idempotency key
fetch('/api/payments', {
  method: 'POST',
  headers: { 'Idempotency-Key': uuid() },
  body: JSON.stringify({ amount: 100 })
});
// Server deduplicates based on key
```

## Related Concepts

- `./rate-limiting.md` - Handling 429 errors with backoff
- `./api-design.md` - Idempotency keys, retry-safe API design
- `./monitoring-and-observability.md` - Tracking retry rates and circuit breaker state
- `./caching.md` - Reduce need for retries through caching
