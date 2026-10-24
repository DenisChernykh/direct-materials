import { useQuery } from '@tanstack/react-query'
import { getHistory } from '../../shared/api'

export function useHistory() {
  return useQuery({ queryKey: ['history'], queryFn: getHistory })
}
