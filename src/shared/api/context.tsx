import { createContext, useContext } from 'react'
import type { ApiClient } from './client'

const ApiContext = createContext<ApiClient | null>(null)
export const ApiProvider = ApiContext.Provider
export function useApi() {
  const value = useContext(ApiContext)
  if (!value) throw new Error('ApiProvider is missing')
  return value
}
