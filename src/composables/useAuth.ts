import { ref, computed } from 'vue'

const token = ref<string | null>(localStorage.getItem('token'))
const user = ref<any>(null) // In a real app, define an interface

// Decode token simply to get username (or call /me endpoint)
const decodeToken = (t: string) => {
  try {
    const parts = t.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (e) {
    return null
  }
}

// Initial check
if (token.value) {
  user.value = decodeToken(token.value)
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  const setToken = (t: string) => {
    token.value = t
    localStorage.setItem('token', t)
    user.value = decodeToken(t)
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  // Generic fetch wrapper that adds auth header
  const authFetch = async (url: string, options: RequestInit = {}) => {
    if (!token.value) throw new Error('Not authenticated')
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token.value}`,
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, { ...options, headers })
    
    if (response.status === 401 || response.status === 403) {
      logout()
      throw new Error('Session expired')
    }
    
    return response
  }

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    logout,
    authFetch
  }
}
