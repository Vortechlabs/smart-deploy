const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('github_token') || getCookie('github_token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `API error: ${response.status}`)
  }
  
  return response.json()
}

export const api = {
  projects: {
    list: () => apiFetch('/projects'),
    get: (id: string) => apiFetch(`/projects/${id}`),
    create: (data: any) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
  },
  deployments: {
    trigger: (projectId: string) => apiFetch(`/deployments/${projectId}/deploy`, { method: 'POST' }),
    get: (id: string) => apiFetch(`/deployments/${id}`),
    logs: (id: string) => apiFetch(`/deployments/${id}/logs`),
  },
}
