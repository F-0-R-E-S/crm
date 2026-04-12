#!/bin/bash
# Initialize NATS JetStream streams for GambChamp CRM
# Run: ./scripts/nats-init.sh [nats-url]

NATS_URL="${1:-nats://localhost:4222}"

echo "Initializing NATS JetStream streams at $NATS_URL..."

# Lead events stream
nats --server "$NATS_URL" stream add LEADS \
  --subjects "lead.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 720h \
  --storage file \
  --replicas 1 \
  --discard old \
  --dupe-window 2m \
  --no-allow-rollup \
  --deny-delete \
  --deny-purge 2>/dev/null || \
nats --server "$NATS_URL" stream info LEADS

# Cap events stream
nats --server "$NATS_URL" stream add CAPS \
  --subjects "cap.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 168h \
  --storage file \
  --replicas 1 \
  --discard old \
  --dupe-window 1m 2>/dev/null || \
nats --server "$NATS_URL" stream info CAPS

# System events stream (affiliates, brokers, health)
nats --server "$NATS_URL" stream add SYSTEM \
  --subjects "affiliate.>,broker.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 720h \
  --storage file \
  --replicas 1 \
  --discard old 2>/dev/null || \
nats --server "$NATS_URL" stream info SYSTEM

# Consumers
echo "Creating consumers..."

# Routing engine consumes lead.received
nats --server "$NATS_URL" consumer add LEADS routing-engine \
  --filter "lead.received" \
  --ack explicit \
  --deliver all \
  --max-deliver 5 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer routing-engine exists"

# Broker adapter consumes lead.routed
nats --server "$NATS_URL" consumer add LEADS broker-adapter \
  --filter "lead.routed" \
  --ack explicit \
  --deliver all \
  --max-deliver 5 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer broker-adapter exists"

# Status sync consumes lead.delivered and lead.delivery_failed
nats --server "$NATS_URL" consumer add LEADS status-sync \
  --filter "lead.delivered" \
  --ack explicit \
  --deliver all \
  --max-deliver 3 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer status-sync exists"

# Autologin consumes lead.delivered (when autologin needed)
nats --server "$NATS_URL" consumer add LEADS autologin \
  --filter "lead.delivered" \
  --ack explicit \
  --deliver all \
  --max-deliver 3 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer autologin exists"

# UAD consumes lead.delivery_failed
nats --server "$NATS_URL" consumer add LEADS uad \
  --filter "lead.delivery_failed" \
  --ack explicit \
  --deliver all \
  --max-deliver 10 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer uad exists"

# Notification service consumes all events
nats --server "$NATS_URL" consumer add LEADS notifications \
  --filter "lead.>" \
  --ack explicit \
  --deliver all \
  --max-deliver 3 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer notifications exists"

# Analytics consumes all events for ClickHouse ingestion
nats --server "$NATS_URL" consumer add LEADS analytics \
  --filter "lead.>" \
  --ack explicit \
  --deliver all \
  --max-deliver 5 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer analytics exists"

# Cap threshold notifications
nats --server "$NATS_URL" consumer add CAPS cap-notifications \
  --filter "cap.>" \
  --ack explicit \
  --deliver all \
  --max-deliver 3 \
  --replay instant \
  --pull 2>/dev/null || echo "Consumer cap-notifications exists"

echo "NATS JetStream initialization complete!"
