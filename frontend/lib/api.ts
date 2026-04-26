// frontend/lib/api.ts
const getApiBaseUrl = () => {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    // In production (VPS), use the same hostname but port 3000 for backend
    if (window.location.hostname !== 'localhost') {
      return `http://${window.location.hostname}:3000`
    }
    // In development, use localhost:3000
    return 'http://localhost:3000'
  }
  // Server-side, use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
}

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('github_token') || getCookie('github_token')
    : null
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string> || {}),
  }
  
  const API_URL = getApiBaseUrl()
  
  console.log(`🔗 Fetching: ${API_URL}${endpoint}`) // Debug log
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `API error: ${response.status}`)
    }
    
    return response.json()
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      console.error('❌ Backend connection failed. Is the server running on', API_URL, '?')
      throw new Error('Cannot connect to backend server. Please make sure the backend is running.')
    }
    throw error
  }
}

export const api = {
  projects: {
    list: () => apiFetch('/projects'),
    get: (id: string) => apiFetch(`/projects/${id}`),
    create: (data: any) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
    checkSubdomain: (subdomain: string) => apiFetch(`/projects/check-subdomain?subdomain=${subdomain}`),
  },
  deployments: {
    trigger: (projectId: string) => apiFetch(`/deployments/${projectId}/deploy`, { method: 'POST' }),
    get: (id: string) => apiFetch(`/deployments/${id}`),
    logs: (id: string) => apiFetch(`/deployments/${id}/logs`),
  },
  monitoring: {
    get: () => apiFetch('/monitoring'),
    cpu: () => apiFetch('/monitoring/cpu'),
    memory: () => apiFetch('/monitoring/memory'),
  }
}

export { getApiBaseUrl }