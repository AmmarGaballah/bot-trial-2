/**
 * API Service for AI Sales Commander
 * Complete implementation with all endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-sales-bot-api-production-412b.up.railway.app';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Authentication required. Please log in again.');
    }
    
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const auth = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  },

  me: async () => {
    return apiRequest('/api/v1/auth/me');
  },

  logout: async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Projects API
export const projects = {
  list: async () => {
    return apiRequest('/api/v1/projects');
  },

  get: async (id) => {
    return apiRequest(`/api/v1/projects/${id}`);
  },

  create: async (data) => {
    return apiRequest('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const orders = {
  list: async (projectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/v1/orders/${projectId}?${query}`);
  },

  get: async (orderId) => {
    return apiRequest(`/api/v1/orders/${orderId}`);
  },

  create: async (projectId, data) => {
    return apiRequest(`/api/v1/orders/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (orderId, status) => {
    return apiRequest(`/api/v1/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  track: async (orderId) => {
    return apiRequest(`/api/v1/orders/${orderId}/track`);
  },

  aiProcess: async (orderId) => {
    return apiRequest(`/api/v1/orders/${orderId}/ai-process`, {
      method: 'POST',
    });
  },

  stats: async (projectId, days = 30) => {
    return apiRequest(`/api/v1/orders/${projectId}/stats?days=${days}`);
  },
};

// Messages API
export const messages = {
  getConversations: async (projectId, params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    const query = searchParams ? `?${searchParams}` : '';
    return apiRequest(`/api/v1/messages/${projectId}/conversations${query}`);
  },

  getMessages: async (projectId, conversationId, params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    const query = searchParams ? `?${searchParams}` : '';
    return apiRequest(`/api/v1/messages/${projectId}/conversations/${conversationId}/messages${query}`);
  },

  send: async (projectId, data) => {
    return apiRequest(`/api/v1/messages/${projectId}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateAIReply: async (projectId, data) => {
    return apiRequest(`/api/v1/assistant/generate-reply`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, ...data }),
    });
  },

  stats: async (projectId) => {
    return apiRequest(`/api/v1/messages/${projectId}/stats/summary`);
  },
};

// Reports API
export const reports = {
  list: async (projectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/v1/reports/${projectId}?${query}`);
  },

  get: async (projectId, reportId) => {
    return apiRequest(`/api/v1/reports/${projectId}/${reportId}`);
  },

  generate: async (projectId, data) => {
    return apiRequest(`/api/v1/reports/${projectId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: async (projectId, reportId) => {
    return apiRequest(`/api/v1/reports/${projectId}/${reportId}`, {
      method: 'DELETE',
    });
  },
};

// Integrations API
export const integrations = {
  list: async (projectId) => {
    return apiRequest(`/api/v1/integrations/${projectId}`);
  },

  get: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}`);
  },

  create: async (projectId, data) => {
    return apiRequest(`/api/v1/integrations/${projectId}/connect`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (projectId, integrationId, data) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}`, {
      method: 'DELETE',
    });
  },

  test: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}/test`, {
      method: 'POST',
    });
  },

  sync: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}/sync`, {
      method: 'POST',
    });
  },

  verify: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}/verify`, {
      method: 'POST',
    });
  },

  debug: async (projectId, integrationId) => {
    return apiRequest(`/api/v1/integrations/${projectId}/${integrationId}/debug`);
  },

  testData: async (projectId, data) => {
    return apiRequest(`/api/v1/integrations/${projectId}/test-data`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// AI Assistant API
export const assistant = {
  query: async (data) => {
    return apiRequest(`/api/v1/assistant/query`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateReply: async (data) => {
    return apiRequest(`/api/v1/assistant/generate-reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  analyzeSentiment: async (projectId, message) => {
    return apiRequest(`/api/v1/assistant/analyze-sentiment`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, message }),
    });
  },

  usage: async (projectId, days = 30) => {
    return apiRequest(`/api/v1/assistant/usage/${projectId}?days=${days}`);
  },
};

// Subscriptions API
export const subscriptions = {
  getPlans: async () => {
    return apiRequest('/api/v1/subscriptions/plans');
  },

  getMySubscription: async () => {
    return apiRequest('/api/v1/subscriptions/my-subscription');
  },

  getUsagePercentage: async () => {
    return apiRequest('/api/v1/subscriptions/usage-percentage');
  },

  getUsageAlerts: async () => {
    return apiRequest('/api/v1/subscriptions/usage-alerts');
  },

  getOverages: async () => {
    return apiRequest('/api/v1/subscriptions/overages');
  },

  upgrade: async (data) => {
    return apiRequest('/api/v1/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancel: async () => {
    return apiRequest('/api/v1/subscriptions/cancel', {
      method: 'POST',
    });
  },
};

// Bot Training API
export const botTraining = {
  getInstructions: async (projectId) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/instructions`);
  },

  createInstruction: async (projectId, data) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/instructions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateInstruction: async (projectId, instructionId, data) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/instructions/${instructionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteInstruction: async (projectId, instructionId) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/instructions/${instructionId}`, {
      method: 'DELETE',
    });
  },

  toggleInstruction: async (projectId, instructionId) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/instructions/${instructionId}/toggle`, {
      method: 'POST',
    });
  },

  seedInstructions: async (projectId) => {
    return apiRequest(`/api/v1/bot-training/${projectId}/seed-instructions`, {
      method: 'POST',
    });
  },
};

// Products API
export const products = {
  list: async (projectId) => {
    return apiRequest(`/api/v1/products/${projectId}`);
  },

  get: async (projectId, productId) => {
    return apiRequest(`/api/v1/products/${projectId}/${productId}`);
  },

  create: async (projectId, data) => {
    return apiRequest(`/api/v1/products/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (projectId, productId, data) => {
    return apiRequest(`/api/v1/products/${projectId}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (projectId, productId) => {
    return apiRequest(`/api/v1/products/${projectId}/${productId}`, {
      method: 'DELETE',
    });
  },

  bulkUpload: async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest(`/api/v1/products/${projectId}/bulk-upload`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  },
};

export default {
  auth,
  projects,
  products,
  orders,
  messages,
  reports,
  integrations,
  assistant,
  subscriptions,
  botTraining,
};
