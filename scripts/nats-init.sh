#!/bin/bash
# Initialize NATS JetStream streams for GambChamp CRM
# Run: ./scripts/nats-init.sh [nats-url]
set -euo pipefail

NATS_URL="${1:-nats://localhost:4222}"
NATS_CMD="nats --server $NATS_URL"

echo "Initializing NATS JetStream streams at $NATS_URL..."

# Streams (lowercase names to match Go service code)
$NATS_CMD stream add leads \
  --subjects "lead.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 720h \
  --storage file \
  --replicas 1 \
  --discard old \
  --dupe-window 2m \
  --max-msg-size=-1 \
  --defaults 2>/dev/null || echo "Stream leads already exists"

$NATS_CMD stream add caps \
  --subjects "cap.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 168h \
  --storage file \
  --replicas 1 \
  --discard old \
  --dupe-window 1m \
  --max-msg-size=-1 \
  --defaults 2>/dev/null || echo "Stream caps already exists"

$NATS_CMD stream add system \
  --subjects "affiliate.>,broker.>" \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age 720h \
  --storage file \
  --replicas 1 \
  --discard old \
  --max-msg-size=-1 \
  --defaults 2>/dev/null || echo "Stream system already exists"

# Consumers
echo "Creating consumers..."

$NATS_CMD consumer add leads routing-engine \
  --filter "lead.received" --ack explicit --deliver all \
  --max-deliver 5 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer routing-engine exists"

$NATS_CMD consumer add leads broker-adapter \
  --filter "lead.routed" --ack explicit --deliver all \
  --max-deliver 5 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer broker-adapter exists"

$NATS_CMD consumer add leads status-sync-delivered \
  --filter "lead.delivered" --ack explicit --deliver all \
  --max-deliver 3 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer status-sync-delivered exists"

$NATS_CMD consumer add leads autologin \
  --filter "lead.delivered" --ack explicit --deliver all \
  --max-deliver 3 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer autologin exists"

$NATS_CMD consumer add leads uad \
  --filter "lead.delivery_failed" --ack explicit --deliver all \
  --max-deliver 10 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer uad exists"

$NATS_CMD consumer add leads notifications \
  --filter "lead.>" --ack explicit --deliver all \
  --max-deliver 3 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer notifications exists"

$NATS_CMD consumer add leads analytics \
  --filter "lead.>" --ack explicit --deliver all \
  --max-deliver 5 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer analytics exists"

$NATS_CMD consumer add caps cap-notifications \
  --filter "cap.>" --ack explicit --deliver all \
  --max-deliver 3 --replay instant --pull \
  --defaults 2>/dev/null || echo "Consumer cap-notifications exists"

echo "NATS JetStream initialization complete!"
