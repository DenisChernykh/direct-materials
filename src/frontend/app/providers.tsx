/** @jsxImportSource react */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router } from './router'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: false } },
})

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  )
}
