# Kafka Producer Examples - Service 1 (Post-Sales Backend)

This folder contains example code demonstrating how to send Kafka events from the Post-Sales service.

## 📋 Prerequisites

1. **Environment Variables**: Make sure your `.env` file contains:
   ```env
   KAFKA_ENABLED=true
   KAFKA_BOOTSTRAP_SERVERS=your-kafka-server:9092
   KAFKA_API_KEY=your-api-key
   KAFKA_API_SECRET=your-api-secret
   ```

2. **Dependencies**: Ensure all npm packages are installed:
   ```bash
   npm install
   ```

## 🚀 Running the Examples

### Run All Examples
```bash
node examples/kafka-producer-example.js
```

### Run Specific Example
```bash
# Example 1: Send Handover Completed Event
node examples/kafka-producer-example.js 1

# Example 2: Send Onboarding Started Event
node examples/kafka-producer-example.js 2

# Example 3: Send Custom Event
node examples/kafka-producer-example.js 3

# Example 4: Send Batch Events
node examples/kafka-producer-example.js 4

# Example 5: Send Event with Retry Logic
node examples/kafka-producer-example.js 5
```

## 📖 Available Examples

### Example 1: Send Handover Completed Event
Demonstrates publishing a handover completion event. This event notifies other services (like Defect Management) that a property handover has been completed.

**Topic**: `postsales.handover.completed`

**Event Data**:
- `unit_id`: Property unit identifier
- `customer_id`: Customer identifier
- `handover_date`: Date of handover
- `handover_by`: Person who conducted the handover
- `handover_notes`: Additional notes

### Example 2: Send Onboarding Started Event
Shows how to publish an event when the onboarding process starts.

**Topic**: `postsales.onboarding.started`

**Event Data**:
- `unit_id`: Property unit identifier
- `customer_id`: Customer identifier
- `onboarding_stage`: Current stage of onboarding
- `assigned_to`: Staff member assigned
- `start_date`: Onboarding start date

### Example 3: Send Custom Event
Demonstrates how to create and send a completely custom event using the Kafka producer directly.

**Topic**: `postsales.custom.events`

Shows:
- Creating custom event structure
- Adding custom headers
- Using event metadata

### Example 4: Send Batch Events
Shows how to send multiple events in a single batch for improved performance.

**Topic**: `postsales.batch.events`

Benefits:
- Reduced network overhead
- Better throughput
- Atomic batch operations

### Example 5: Send Event with Retry Logic
Demonstrates a robust event publishing pattern with:
- Automatic retry on failure
- Exponential backoff
- Maximum retry limits

## 🔧 Customizing for Your Use Case

### Creating a New Event Type

1. **Define your event structure**:
```javascript
const event = {
  eventId: require('uuid').v4(),
  eventType: 'postsales.your.event',
  timestamp: new Date().toISOString(),
  data: {
    // Your custom data here
  },
  metadata: {
    source: 'postsales-backend-bridge',
    version: '1.0'
  }
};
```

2. **Send to Kafka**:
```javascript
const message = {
  topic: 'postsales.your.topic',
  messages: [{
    key: 'your-key',
    value: JSON.stringify(event)
  }]
};

await producer.send(message);
```

### Event Naming Conventions

Follow this pattern: `service.entity.action`

Examples:
- `postsales.handover.completed`
- `postsales.onboarding.started`
- `postsales.defect.reported`
- `postsales.payment.received`

## 📊 Monitoring Events

You can verify events are being sent by:

1. **Checking console logs**: The examples include detailed logging
2. **Using Kafka tools**: 
   ```bash
   # If you have Kafka CLI tools installed
   kafka-console-consumer --bootstrap-server <server> \
     --topic postsales.handover.completed \
     --from-beginning
   ```

3. **Checking Confluent Cloud**: View topics and messages in the web console

## ⚠️ Important Notes

- Events are published asynchronously
- If Kafka is disabled (`KAFKA_ENABLED=false`), events will not be sent but won't cause errors
- The producer automatically reconnects on connection loss
- Always handle errors gracefully in production code

## 🔗 Related Files

- [Producer Implementation](../kafka/producer.js)
- [Consumer Implementation](../kafka/consumer.js)
- [Kafka Configuration](../kafka/config.js)
- [Event Handlers](../services/eventHandlers.js)

## 🆘 Troubleshooting

### Producer Not Connecting
- Verify `KAFKA_ENABLED=true`
- Check `KAFKA_BOOTSTRAP_SERVERS` is correct
- Validate API credentials

### Events Not Being Received by Consumers
- Verify topic names match exactly
- Check consumer group is running
- Ensure network connectivity between services

### SSL/TLS Issues
- For development, you can set `KAFKA_DISABLE_SSL_VERIFICATION=true`
- For production, ensure proper SSL certificates

## 📚 Additional Resources

- [Confluent Kafka Documentation](https://docs.confluent.io/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Event-Driven Architecture Best Practices](https://www.confluent.io/blog/event-driven-architecture/)
