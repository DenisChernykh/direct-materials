import { useQuery } from '@tanstack/react-query'
import { getSession } from '../../shared/api'

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
    staleTime: 30_000,
  })
}
