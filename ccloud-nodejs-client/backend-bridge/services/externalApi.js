const axios = require('axios');

/**
 * External API Client for calling other team services
 * Handles API requests to Inventory, Legal, and other teams
 */

// Base URLs for external team services
// These URLs point to other team's microservices
const INVENTORY_BASE_URL = process.env.INVENTORY_SERVICE_URL || 'https://inventory-service.onrender.com';
const LEGAL_CONTRACT_BASE_URL = process.env.LEGAL_CONTRACT_SERVICE_URL || 'https://contract-service-h5fs.onrender.com';
const LEGAL_WARRANTY_BASE_URL = process.env.LEGAL_WARRANTY_SERVICE_URL || 'https://warranty-service-gtv0.onrender.com';
const LEGAL_ACQUISITION_BASE_URL = process.env.LEGAL_ACQUISITION_SERVICE_URL || 'https://acquisition-service.onrender.com';
const PAYMENT_BASE_URL = process.env.PAYMENT_SERVICE_URL || 'https://cstu-payment-team.onrender.com';

console.log('🔗 External Service URLs:');
console.log('  - Inventory:', INVENTORY_BASE_URL);
console.log('  - Legal Contract:', LEGAL_CONTRACT_BASE_URL);
console.log('  - Legal Warranty:', LEGAL_WARRANTY_BASE_URL);
console.log('  - Legal Acquisition:', LEGAL_ACQUISITION_BASE_URL);
console.log('  - Payment:', PAYMENT_BASE_URL);

// Create axios instances with timeouts
const inventoryClient = axios.create({
  baseURL: INVENTORY_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

const legalContractClient = axios.create({
  baseURL: LEGAL_CONTRACT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const legalWarrantyClient = axios.create({
  baseURL: LEGAL_WARRANTY_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const paymentClient = axios.create({
  baseURL: PAYMENT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Add error interceptor for better logging
 */
function addErrorInterceptor(client, serviceName) {
  client.interceptors.response.use(
    response => response,
    error => {
      const errorInfo = {
        service: serviceName,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      };
      
      console.error(`❌ External API Error (${serviceName}):`, errorInfo);
      
      // Enhance error with user-friendly message
      error.userMessage = `ไม่สามารถเชื่อมต่อกับระบบ ${serviceName} ได้`;
      error.serviceInfo = errorInfo;
      
      return Promise.reject(error);
    }
  );
}

addErrorInterceptor(inventoryClient, 'Inventory');
addErrorInterceptor(legalContractClient, 'Legal-Contract');
addErrorInterceptor(legalWarrantyClient, 'Legal-Warranty');
addErrorInterceptor(paymentClient, 'Payment');

// ==========================================
// INVENTORY TEAM APIs
// ==========================================

/**
 * Get property history from Inventory team
 * Used for defect assessment to see previous issues/changes
 * @param {string} propertyId - Property/Unit ID
 * @returns {Promise<Object>} Property history with events
 */
async function getPropertyHistory(propertyId) {
  try {
    console.log(`📞 Calling Inventory API: GET /api/v1/properties/${propertyId}/history`);
    
    const response = await inventoryClient.get(`/api/v1/properties/${propertyId}/history`);
    
    console.log(`✅ Property history retrieved for: ${propertyId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get property history for ${propertyId}:`, error.message);
    
    // Return null instead of throwing to allow graceful degradation
    return null;
  }
}

/**
 * Get property details from Inventory team
 * @param {string} propertyId - Property/Unit ID
 * @returns {Promise<Object>} Property details
 */
async function getPropertyDetails(propertyId) {
  try {
    console.log(`📞 Calling Inventory API: GET /api/v1/properties/${propertyId}`);
    
    const response = await inventoryClient.get(`/api/v1/properties/${propertyId}`);
    
    console.log(`✅ Property details retrieved for: ${propertyId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get property details for ${propertyId}:`, error.message);
    return null;
  }
}

// ==========================================
// LEGAL TEAM APIs - Contract Service
// ==========================================

/**
 * Get contract details from Legal Contract Service
 * @param {string} contractId - Contract ID
 * @returns {Promise<Object>} Contract details
 */
async function getContractDetails(contractId) {
  try {
    console.log(`📞 Calling Legal Contract API: GET /api/contracts/${contractId}`);
    
    const response = await legalContractClient.get(`/api/contracts/${contractId}`);
    
    console.log(`✅ Contract details retrieved: ${contractId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get contract details for ${contractId}:`, error.message);
    return null;
  }
}

// ==========================================
// LEGAL TEAM APIs - Warranty Service
// ==========================================

/**
 * Get warranty coverage for a contract/unit
 * Used to check if defect is covered by warranty
 * @param {string} contractId - Contract ID
 * @returns {Promise<Object>} Warranty coverage details
 */
async function getWarrantyCoverage(contractId) {
  try {
    console.log(`📞 Calling Legal Warranty API: GET /api/warranties/${contractId}`);
    
    const response = await legalWarrantyClient.get(`/api/warranties/${contractId}`);
    
    console.log(`✅ Warranty coverage retrieved for contract: ${contractId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get warranty coverage for ${contractId}:`, error.message);
    return null;
  }
}

/**
 * Submit warranty claim for a defect
 * Posts defect to Legal Warranty Service for coverage verification
 * @param {Object} defectData - Defect claim data
 * @returns {Promise<Object>} Claim submission result
 */
async function submitWarrantyClaim(defectData) {
  try {
    const claimPayload = {
      defectId: defectData.id,
      contractId: defectData.contract_id,
      unitId: defectData.unit_id,
      customerId: defectData.customer_id,
      defectCategory: defectData.category,
      description: defectData.description,
      reportedAt: defectData.created_at,
      severity: defectData.priority
    };
    
    console.log(`📞 Calling Legal Warranty API: POST /api/warranties/claims`);
    console.log(`   Defect ID: ${defectData.id}`);
    console.log(`   Category: ${defectData.category}`);
    
    const response = await legalWarrantyClient.post('/api/warranties/claims', claimPayload);
    
    console.log(`✅ Warranty claim submitted successfully`);
    console.log(`   Claim ID: ${response.data.claimId}`);
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to submit warranty claim for defect ${defectData.id}:`, error.message);
    
    // Don't throw - allow defect creation to continue even if warranty check fails
    return {
      success: false,
      error: error.message,
      claimId: null
    };
  }
}

/**
 * Get warranty claim status
 * Check status of previously submitted claim
 * @param {string} claimId - Warranty claim ID
 * @returns {Promise<Object>} Claim status
 */
async function getWarrantyClaimStatus(claimId) {
  try {
    console.log(`📞 Calling Legal Warranty API: GET /api/warranties/claims/${claimId}`);
    
    const response = await legalWarrantyClient.get(`/api/warranties/claims/${claimId}`);
    
    console.log(`✅ Warranty claim status retrieved: ${claimId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get warranty claim status for ${claimId}:`, error.message);
    return null;
  }
}

// ==========================================
// PAYMENT TEAM APIs
// ==========================================

/**
 * Get payment details for a customer/unit
 * NOTE: Payment team endpoint structure needs confirmation
 * Possible endpoints:
 *   - /api/payments/{customerId}/{unitId}
 *   - /api/payments/customer/{customerId}
 *   - /settlement/api/settlements/summary
 * 
 * @param {string} customerId - Customer ID
 * @param {string} unitId - Unit ID (optional)
 * @returns {Promise<Object>} Payment details and status
 */
async function getPaymentDetails(customerId, unitId = null) {
  try {
    // Try different endpoint patterns
    let endpoint;
    if (unitId) {
      endpoint = `/api/payments/${customerId}/${unitId}`;
    } else {
      endpoint = `/api/payments/customer/${customerId}`;
    }
    
    console.log(`📞 Calling Payment API: GET ${endpoint}`);
    
    const response = await paymentClient.get(endpoint);
    
    console.log(`✅ Payment details retrieved for customer: ${customerId}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to get payment details for customer ${customerId}:`, {
      message: error.message,
      status: error.response?.status,
      endpoint: error.config?.url,
      baseURL: PAYMENT_BASE_URL
    });
    
    // Return graceful null if service is unavailable (503)
    if (error.response?.status === 503) {
      console.warn('⚠️  Payment service is currently unavailable (503)');
    }
    
    return null;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Health check for external services
 * Tests connectivity to all external APIs
 * @returns {Promise<Object>} Health status for each service
 */
async function checkExternalServicesHealth() {
  const healthStatus = {
    inventory: { available: false, responseTime: null },
    legalContract: { available: false, responseTime: null },
    legalWarranty: { available: false, responseTime: null },
    payment: { available: false, responseTime: null }
  };
  
  // Check Inventory
  try {
    const startTime = Date.now();
    await inventoryClient.get('/health', { timeout: 5000 });
    healthStatus.inventory = {
      available: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    console.warn('Inventory service unavailable:', error.message);
  }
  
  // Check Legal Contract
  try {
    const startTime = Date.now();
    await legalContractClient.get('/health', { timeout: 5000 });
    healthStatus.legalContract = {
      available: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    console.warn('Legal Contract service unavailable:', error.message);
  }
  
  // Check Legal Warranty
  try {
    const startTime = Date.now();
    await legalWarrantyClient.get('/health', { timeout: 5000 });
    healthStatus.legalWarranty = {
      available: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    console.warn('Legal Warranty service unavailable:', error.message);
  }
  
  // Check Payment
  try {
    const startTime = Date.now();
    await paymentClient.get('/health', { timeout: 5000 });
    healthStatus.payment = {
      available: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    console.warn('Payment service unavailable:', error.message);
  }
  
  return healthStatus;
}

module.exports = {
  // Inventory APIs
  getPropertyHistory,
  getPropertyDetails,
  
  // Legal Contract APIs
  getContractDetails,
  
  // Legal Warranty APIs
  getWarrantyCoverage,
  submitWarrantyClaim,
  getWarrantyClaimStatus,
  
  // Payment APIs
  getPaymentDetails,
  
  // Utilities
  checkExternalServicesHealth
};
