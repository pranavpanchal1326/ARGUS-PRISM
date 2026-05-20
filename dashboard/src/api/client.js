const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiCall(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error ${response.status}`);
  }
  return response.json();
}

export const api = {
  getHealth: () => apiCall('GET', '/health'),
  getAccounts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall('GET', `/api/accounts?${query}`);
  },
  getAccount: (id) => apiCall('GET', `/api/accounts/${id}`),
  getAccountAlerts: (id) => apiCall('GET', `/api/accounts/${id}/alerts`),
  getAccountSignalTimeline: (id, hours = 72) =>
    apiCall('GET', `/api/accounts/${id}/timeline/signals?hours=${hours}`),
  getAccountGraphEvents: (id) =>
    apiCall('GET', `/api/accounts/${id}/timeline/graph-events`),
  flagMule: (id, payload) =>
    apiCall('POST', `/api/accounts/${id}/flag-mule`, payload),
  updateStatus: (id, payload) =>
    apiCall('PATCH', `/api/accounts/${id}/status`, payload),
  scoreAccount: (payload) =>
    apiCall('POST', '/api/v1/warmthscore/score', payload),
  getScoreTimeline: (id, limit = 50) =>
    apiCall('GET', `/api/v1/warmthscore/${id}/timeline?limit=${limit}`),
  getModelStatus: () =>
    apiCall('GET', '/api/v1/warmthscore/model/status'),
  getRecruiterMap: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall('GET', `/api/recruiter/map?${query}`);
  },
  getRecruiterCampaign: (id) =>
    apiCall('GET', `/api/recruiter/${id}/campaign`),
  freezeCampaign: (id, payload) =>
    apiCall('POST', `/api/recruiter/${id}/freeze`, payload),
  generateSTR: (caseId, payload) =>
    apiCall('POST', `/api/autostr/generate/${caseId}`, payload),
};
