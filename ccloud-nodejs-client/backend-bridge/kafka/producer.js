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
    
    console.log(`\n📥 Received handover data:`);
    console.log(JSON.stringify(handoverData, null, 2));
    
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

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    const message = {
      topic,
      messages: [{
        key: handoverData.unit_id,
        value: JSON.stringify(event)
      }]
    };

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
    
    console.log(`\n📥 Received onboarding data:`);
    console.log(JSON.stringify(onboardingData, null, 2));
    
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

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    await producer.send({
      topic,
      messages: [{ key: onboardingData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`\n✅ Published successfully!`);
    
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
    
    console.log(`\n📥 Received member data:`);
    console.log(JSON.stringify(memberData, null, 2));
    
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

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    await producer.send({
      topic,
      messages: [{ key: memberData.customerId, value: JSON.stringify(event) }]
    });

    console.log(`\n✅ Published successfully!`);
    console.log(`   Customer: ${memberData.customerId}, Unit: ${memberData.unitId}`);
    console.log(`   Area: ${memberData.areaSize || 'N/A'} sqm, Fee: ${memberData.feeRatePerSqm || 45.0} THB/sqm\n`);
    
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
    
    console.log(`\n📥 Received completion data:`);
    console.log(JSON.stringify(completionData, null, 2));
    
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

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    await producer.send({
      topic,
      messages: [{ key: completionData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`\n✅ Published successfully!`);
    
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
 * Publish defect case closed event
 * This is the final status when repair is completed
 * 
 * DEPRECATED: Marketing Team now uses REST API instead of Kafka
 * See GET /api/defects/closed-cases endpoint
 */
/*
async function publishDefectClosed(closeData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.caseclosed.completed';
    
    console.log(`\n📥 Received close data:`);
    console.log(JSON.stringify(closeData, null, 2));
    
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

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    await producer.send({
      topic,
      messages: [{ key: closeData.unitId, value: JSON.stringify(event) }]
    });

    console.log(`\n✅ Published successfully! - Defect #${closeData.defectNumber} closed`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'postsales.caseclosed.completed',
      defectNumber: closeData.defectNumber,
      error: error.message
    });
    return null;
  }
}
*/

/**
 * Publish warranty defect reported event
 * Legal team will process and respond with warranty.coverage.verified
 */
async function publishWarrantyDefectReported(defectData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'warranty.defect.reported';
    
    console.log(`\n📥 Received defect data:`);
    console.log(JSON.stringify(defectData, null, 2));
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'warranty.defect.reported',
      timestamp: new Date().toISOString(),
      data: {
        defectId: defectData.id,
        contractId: defectData.contract_id || null,
        unitId: defectData.unit_id,
        customerId: defectData.customer_id || null,
        defectCategory: defectData.category,
        description: defectData.description,
        reportedAt: defectData.reported_at
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    console.log(`\n📤 Publishing event to ${topic}:`);
    console.log(JSON.stringify(event, null, 2));

    await producer.send({
      topic,
      messages: [{ key: defectData.unit_id, value: JSON.stringify(event) }]
    });

    console.log(`\n✅ Published successfully! - Defect #${defectData.defect_number} reported to Legal`);
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', {
      topic: 'warranty.defect.reported',
      defectNumber: defectData.defect_number,
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
  publishWarrantyDefectReported,
  // publishDefectClosed, // DEPRECATED: Marketing uses REST API
  disconnectProducer
};
