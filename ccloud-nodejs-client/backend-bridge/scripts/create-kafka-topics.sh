#!/bin/bash
# Create Required Kafka Topics for External Team Simulation
# Run this script to create all necessary topics in Confluent Cloud

echo "Creating Kafka Topics for External Teams..."
echo "============================================"

# Topics that need to be created:
TOPICS=(
  "managing.kyc.complete"
  "purchase.contract.drafted"
  "payment.secondpayment.completed"
  "payment.invoice.commonfees.completed"
  "warranty.coverage.verified-topic"
  "postsales.handover.completed"
  "postsales.onboarding.started"
  "postsales.onboarding.completed"
)

echo ""
echo "Required Topics:"
for topic in "${TOPICS[@]}"; do
  echo "  - $topic"
done

echo ""
echo "============================================"
echo "Please create these topics manually in Confluent Cloud:"
echo ""
echo "1. Go to: https://confluent.cloud"
echo "2. Navigate to your cluster"
echo "3. Click 'Topics' in the left menu"
echo "4. Click '+ Add topic' button"
echo "5. Create each topic with these settings:"
echo "   - Partitions: 1 (or more for production)"
echo "   - Retention time: 7 days (default)"
echo "   - Cleanup policy: delete"
echo ""
echo "OR use Confluent CLI:"
echo ""
for topic in "${TOPICS[@]}"; do
  echo "confluent kafka topic create $topic --partitions 1"
done
echo ""
echo "============================================"
