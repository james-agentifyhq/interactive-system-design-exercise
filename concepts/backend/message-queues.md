# Message Queues

**What**: Asynchronous communication pattern where producers send messages to a queue, and consumers process them independently, decoupling sender and receiver.

**When to use**: Task processing (emails, thumbnails), event-driven architectures, buffering traffic spikes, inter-service communication, distributed transactions (saga pattern).

**Tradeoffs**: Decoupling and load leveling vs added complexity (monitoring, ordering, retries), eventual consistency, operational overhead (queue infrastructure).

## How It Works

**Messaging patterns**:

1. **Point-to-point (work queue)**:
   - One message → one consumer
   - Load balancing across workers
   - Example: SQS, RabbitMQ queues

2. **Pub/sub (topics)**:
   - One message → multiple subscribers
   - Broadcast events to interested services
   - Example: Kafka topics, SNS, Google Pub/Sub

```
Pub/Sub:
Producer → [Topic] → Consumer A (emails)
                  → Consumer B (analytics)
                  → Consumer C (webhooks)

Point-to-point:
Producer → [Queue] → Worker 1
                  → Worker 2 (compete for messages)
```

**Ordering guarantees**:
- **No ordering**: Messages can arrive out of order (most scalable)
- **Partition ordering**: Messages with same partition key are ordered (Kafka, Kinesis)
- **Global ordering**: All messages in order (single consumer, low throughput)

**Delivery semantics**:
- **At-most-once**: May lose messages (fire-and-forget)
- **At-least-once**: May duplicate messages (default for SQS, RabbitMQ)
- **Exactly-once**: No loss or duplication (Kafka transactions, expensive)

Idempotent consumers handle duplicates gracefully (use deduplication keys).

**Dead letter queue (DLQ)**: Failed messages (after retries) go to DLQ for manual inspection. Prevents poison messages from blocking queue.

**Popular systems**:
- **Kafka**: High-throughput, log-based, partition ordering, exactly-once, replayable. Use for event streaming, logs.
- **RabbitMQ**: Feature-rich, AMQP protocol, flexible routing, complex topologies. Use for task queues, RPC.
- **AWS SQS**: Managed, simple, at-least-once, no ordering (FIFO queues have limited throughput). Use for decoupling AWS services.
- **Google Pub/Sub**: Managed, global, at-least-once, push/pull. Use for GCP event-driven systems.
- **Redis Streams**: Lightweight, in-memory, consumer groups. Use for simple pub/sub, caching + queuing.

## Complexity / Performance

- **Throughput**: Kafka (millions/sec), RabbitMQ (50K/sec), SQS (unlimited with batching)
- **Latency**: Redis (~1ms), RabbitMQ (~5ms), Kafka (~10ms), SQS (~100ms)
- **Durability**: Persist to disk (Kafka, RabbitMQ) vs in-memory (Redis, optional)
- **Retention**: Kafka (days/weeks, replayable), SQS (14 days max), RabbitMQ (until consumed)

**[Backpressure](backpressure.md)**: If consumers slow, queue grows. Monitor queue depth, autoscale consumers, or apply rate limits.

## Real-World Examples

- **Uber**: Kafka for event streaming, 100K+ topics, trillions of messages/day
- **Netflix**: SQS for async task processing (encoding, recommendations)
- **Slack**: RabbitMQ for message delivery, presence updates
- **LinkedIn**: Kafka (originally built for LinkedIn's activity feeds)
- **Shopify**: Kafka for order processing, inventory updates
- **Airbnb**: Kafka for data pipelines, analytics

## Related Concepts

- [`load-balancing.md`](./load-balancing.md) — Queue acts as load leveler
- [`replication.md`](./replication.md) — Queues replicate for HA (Kafka, RabbitMQ)
- [`sharding.md`](./sharding.md) — Kafka partitions are shards
- [`lru-cache.md`](./lru-cache.md) — Cache invalidation via queue events
