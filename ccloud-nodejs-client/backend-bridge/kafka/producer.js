const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');

let producer = null;

/**
 * Initialize Kafka producer
 */
async function initProducer() {
  const config = readKafkaConfig();
  
  // Check if Kafka is disabled
  if (!config) {
    console.log('ℹ️  Kafka producer not initialized (Kafka is disabled)');
    return;
  }
  
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
 * Updated to include billing cycle information per TEAM_INTEGRATION.md
 */
async function publishMemberRegistered(memberData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.member.registered';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.member.registered',
      timestamp: memberData.timestamp || new Date().toISOString(),
      data: {
        customerId: memberData.customerId,
        unitId: memberData.unitId,
        areaSize: memberData.areaSize || memberData.area_size,
        feeRatePerSqm: memberData.feeRatePerSqm || memberData.fee_rate_per_sqm || 45.0,
        effectiveDate: memberData.effectiveDate || memberData.registered_at,
        billingCycle: memberData.billingCycle || 'MONTHLY',
        propertyId: memberData.propertyId || memberData.property_id || memberData.unitId
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
    console.log(`   📍 Unit: ${memberData.unitId}, Area: ${memberData.areaSize || 'N/A'} sqm`);
    console.log(`   💰 Fee Rate: ${memberData.feeRatePerSqm || 45.0} THB/sqm, Cycle: ${memberData.billingCycle || 'MONTHLY'}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.member.registered',
      customerId: memberData.customerId,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish profile activated event (Resident Profile Activated)
 * Per TEAM_INTEGRATION.md - postsales.profile.activated
 */
async function publishOnboardingCompleted(completionData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.profile.activated';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.profile.activated',
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
      topic: 'postsales.profile.activated',
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
 * Publish defect scheduled for repair event
 */
async function publishDefectScheduled(scheduleData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.scheduled';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.scheduled',
      timestamp: scheduleData.timestamp || new Date().toISOString(),
      data: {
        defectId: scheduleData.defectId,
        defectNumber: scheduleData.defectNumber,
        unitId: scheduleData.unitId,
        assignedTo: scheduleData.assignedTo,
        scheduledDate: scheduleData.scheduledDate
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: scheduleData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${scheduleData.defectNumber} → ${scheduleData.assignedTo} on ${scheduleData.scheduledDate}`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.defect.scheduled',
      defectNumber: scheduleData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish defect case closed event
 * This is the final status when repair is completed
 */
async function publishDefectClosed(closeData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.caseclosed.completed';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.caseclosed.completed',
      timestamp: closeData.timestamp || new Date().toISOString(),
      data: {
        defectId: closeData.defectId,
        defectNumber: closeData.defectNumber,
        unitId: closeData.unitId,
        closedBy: closeData.closedBy
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: closeData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${closeData.defectNumber} closed`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.caseclosed.completed',
      defectNumber: closeData.defectNumber,
      error: error.message
    });
    return null;
  }
}

/**
 * Publish warranty defect reported event
 * Sends defect to Legal Warranty Service for coverage check
 * Per TEAM_INTEGRATION.md Section 8.2
 */
async function publishWarrantyDefectReported(defectData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.warranty.defect.reported';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.warranty.defect.reported',
      timestamp: new Date().toISOString(),
      data: {
        defectId: defectData.id,
        defectNumber: defectData.defect_number,
        contractId: defectData.contract_id,
        unitId: defectData.unit_id,
        customerId: defectData.customer_id,
        defectCategory: defectData.category,
        description: defectData.description,
        reportedAt: defectData.created_at,
        priority: defectData.priority
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0',
        requestType: 'warranty_coverage_check'
      }
    };

    await producer.send({
      topic,
      messages: [{ key: defectData.unit_id, value: JSON.stringify(event) }]
    });

    console.log(`✅ Published: ${topic} - Defect #${defectData.defect_number}`);
    console.log(`   🏥 Requesting warranty coverage check from Legal team`);
    console.log(`   📋 Category: ${defectData.category}, Priority: ${defectData.priority}`);
    
    return { success: true, topic, defectId: defectData.id };
    
  } catch (error) {
    console.error('❌ Failed to publish warranty defect event:', {
      topic: 'postsales.warranty.defect.reported',
      defectId: defectData.id,
      error: error.message
    });
    return { success: false, error: error.message };
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
  publishDefectScheduled,
  publishDefectClosed,  
  publishWarrantyDefectReported,
  disconnectProducer
};
