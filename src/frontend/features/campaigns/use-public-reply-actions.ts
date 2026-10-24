import { useMutation, useQueryClient } from '@tanstack/react-query'
import { backfillPublicReplies, retryPublicReplies } from '../../shared/api'

export function usePublicReplyActions(campaignId: string) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }
  const backfill = useMutation({
    mutationFn: (expectedCount: number) =>
      backfillPublicReplies(campaignId, expectedCount),
    onSuccess: invalidate,
  })
  const retry = useMutation({
    mutationFn: (expectedCount: number) =>
      retryPublicReplies(campaignId, expectedCount),
    onSuccess: invalidate,
  })
  return { backfill, retry }
}
