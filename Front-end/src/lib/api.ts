import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export { API_BASE_URL };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error logging and handling
    if (error.response) {
      // Server responded with error
      const errorData = error.response.data?.error;

      console.error('❌ API Error Response:', {
        status: error.response.status,
        code: errorData?.code || 'UNKNOWN_ERROR',
        message: errorData?.message || error.message,
        path: errorData?.path || error.config?.url,
        timestamp: errorData?.timestamp
      });

      // Attach user-friendly message to error
      error.userMessage = errorData?.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์';

      // Show detailed error for 500+ errors
      if (error.response.status >= 500) {
        console.error('🔥 Server Error Details:', errorData);
      }

    } else if (error.request) {
      // Request was made but no response
      console.error('❌ Network Error: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
      error.userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่อ';
    } else {
      // Something else happened
      console.error('❌ Request Error:', error.message);
      error.userMessage = 'เกิดข้อผิดพลาดในการส่งคำขอ';
    }

    return Promise.reject(error);
  }
);
