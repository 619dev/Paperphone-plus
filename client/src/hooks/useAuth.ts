import { useStore } from '../store'

export function useAuth() {
  const token = useStore(s => s.token)
  const user = useStore(s => s.user)
  const setAuth = useStore(s => s.setAuth)
  const logout = useStore(s => s.logout)

  return {
    isAuthenticated: !!token,
    token,
    user,
    setAuth,
    logout,
  }
}
