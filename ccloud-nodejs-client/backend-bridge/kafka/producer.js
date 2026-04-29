const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');

let producer = null;

/**
 * Initialize Kafka producer
 */
async function initProducer() {
  const config = readKafkaConfig();
  
  const kafka = new Kafka();
  producer = kafka.producer(config);

  console.log('🔄 Connecting Kafka producer...');
  await producer.connect();
  console.log('✅ Kafka producer connected!');
}

/**
 * Publish handover completed event
 */
async function publishHandoverCompleted(handoverData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.handover.completed';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.handover.completed',
      timestamp: new Date().toISOString(),
      data: {
        unitId: handoverData.unit_id,
        customerId: handoverData.customer_id,
        handoverDate: handoverData.handover_date,
        handoverBy: handoverData.handover_by,
        notes: handoverData.handover_notes
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    const message = {
      topic,
      messages: [{
        key: handoverData.unit_id,
        value: JSON.stringify(event)
      }]
    };

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(`   Unit ID: ${handoverData.unit_id}`);
    console.log(`   Customer ID: ${handoverData.customer_id}`);

    const result = await producer.send(message);
    
    console.log(`✅ Event published successfully!`);
    console.log(`   Partition: ${result[0].partition}`);
    console.log(`   Offset: ${result[0].baseOffset}\n`);

    return result;
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.handover.completed',
      unitId: handoverData.unit_id,
      customerId: handoverData.customer_id,
      error: error.message,
      code: error.code
    });
    // Don't throw - let API continue even if Kafka fails
    return null;
  }
}

/**
 * Publish owner onboarding started event
 */
async function publishOnboardingStarted(onboardingData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.onboarding.started';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.onboarding.started',
      timestamp: onboardingData.timestamp || new Date().toISOString(),
      data: {
        caseId: onboardingData.caseId,
        unitId: onboardingData.unitId,
        customerId: onboardingData.customerId
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: onboardingData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Unit: ${onboardingData.unitId}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.onboarding.started',
      unitId: onboardingData.unitId,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish member registered event (for Payment team to setup billing)
 */
async function publishMemberRegistered(memberData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.onboarding.memberregistered';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.onboarding.memberregistered',
      timestamp: memberData.timestamp || new Date().toISOString(),
      data: {
        caseId: memberData.caseId,
        unitId: memberData.unitId,
        customerId: memberData.customerId,
        email: memberData.email,
        phone: memberData.phone
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: memberData.customerId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Customer: ${memberData.customerId}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.onboarding.memberregistered',
      customerId: memberData.customerId,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish onboarding completed event
 */
async function publishOnboardingCompleted(completionData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.onboarding.completed';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.onboarding.completed',
      timestamp: completionData.timestamp || new Date().toISOString(),
      data: {
        caseId: completionData.caseId,
        unitId: completionData.unitId,
        customerId: completionData.customerId,
        completedBy: completionData.completedBy
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: completionData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Unit: ${completionData.unitId}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.onboarding.completed',
      unitId: completionData.unitId,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish defect reported event
 */
async function publishDefectReported(defectData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.reported';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.reported',
      timestamp: defectData.timestamp || new Date().toISOString(),
      data: {
        defectId: defectData.defectId,
        defectNumber: defectData.defectNumber,
        unitId: defectData.unitId,
        title: defectData.title,
        category: defectData.category,
        priority: defectData.priority,
        reportedBy: defectData.reportedBy
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: defectData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${defectData.defectNumber}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.defect.reported',
      defectNumber: defectData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish defect assigned event
 */
async function publishDefectAssigned(assignmentData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.assigned';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.assigned',
      timestamp: assignmentData.timestamp || new Date().toISOString(),
      data: {
        defectId: assignmentData.defectId,
        defectNumber: assignmentData.defectNumber,
        unitId: assignmentData.unitId,
        assignedTo: assignmentData.assignedTo
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: assignmentData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${assignmentData.defectNumber} → ${assignmentData.assignedTo}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.defect.assigned',
      defectNumber: assignmentData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish defect resolved event
 */
async function publishDefectResolved(resolutionData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.resolved';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.resolved',
      timestamp: resolutionData.timestamp || new Date().toISOString(),
      data: {
        defectId: resolutionData.defectId,
        defectNumber: resolutionData.defectNumber,
        unitId: resolutionData.unitId,
        resolvedBy: resolutionData.resolvedBy
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: resolutionData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${resolutionData.defectNumber}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.defect.resolved',
      defectNumber: resolutionData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish defect verified event
 */
async function publishDefectVerified(verificationData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.verified';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.verified',
      timestamp: verificationData.timestamp || new Date().toISOString(),
      data: {
        defectId: verificationData.defectId,
        defectNumber: verificationData.defectNumber,
        unitId: verificationData.unitId,
        verifiedBy: verificationData.verifiedBy
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: verificationData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${verificationData.defectNumber}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.defect.verified',
      defectNumber: verificationData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Disconnect producer
 */
async function disconnectProducer() {
  if (producer) {
    await producer.disconnect();
    console.log('✅ Kafka producer disconnected');
  }
}

module.exports = {
  initProducer,
  publishHandoverCompleted,
  publishOnboardingStarted,
  publishMemberRegistered,
  publishOnboardingCompleted,
  publishDefectReported,
  publishDefectAssigned,
  publishDefectResolved,
  publishDefectVerified,
  disconnectProducer
};
