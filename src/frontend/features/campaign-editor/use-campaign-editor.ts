import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  campaignFormSchema,
  campaignToForm,
  emptyCampaignForm,
  formToCampaignWrite,
  type CampaignFormValues,
} from '../../entities/campaign'
import {
  createCampaign,
  getCampaign,
  getMedia,
  recoverDelivery,
  setCampaignStatus,
  updateCampaign,
  type Campaign,
  type Media,
} from '../../shared/api'
import { usePublicReplyActions } from '../campaigns/use-public-reply-actions'
import { zodResolver } from '@hookform/resolvers/zod'

export type CampaignConfirmation = {
  message: string
  action: () => void
}

export type CampaignEditorModel = {
  id?: string
  editing: boolean
  campaign?: Campaign
  media: Media[]
  selectedMedia?: Media
  form: ReturnType<typeof useForm<CampaignFormValues>>
  saveCampaign: (values: CampaignFormValues) => void
  savePending: boolean
  statusPending: boolean
  setStatus: (status: 'active' | 'paused') => void
  actionError: unknown
  actionPending: boolean
  backfillCount: number
  failedCount: number
  backfill: (expectedCount: number) => void
  retry: (expectedCount: number) => void
  recoveryCommentId: string
  setRecoveryCommentId: (value: string) => void
  recoveryText: string
  setRecoveryText: (value: string) => void
  recoverDelivery: () => void
  confirmation: CampaignConfirmation | null
  setConfirmation: (confirmation: CampaignConfirmation | null) => void
  campaignPending: boolean
  campaignError: unknown
}

export function useCampaignEditor(id: string | undefined): CampaignEditorModel {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editing = Boolean(id)
  const campaignQuery = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id as string),
    enabled: editing,
  })
  const mediaQuery = useQuery({ queryKey: ['media'], queryFn: getMedia })
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: emptyCampaignForm,
  })
  const values = form.watch()
  const [confirmation, setConfirmation] = useState<CampaignConfirmation | null>(
    null,
  )
  const [recoveryCommentId, setRecoveryCommentId] = useState('')
  const [recoveryText, setRecoveryText] = useState('')

  useEffect(() => {
    if (campaignQuery.data?.campaign)
      form.reset(campaignToForm(campaignQuery.data.campaign))
  }, [campaignQuery.data, form])

  const save = useMutation({
    mutationFn: (formValues: CampaignFormValues) => {
      const body = formToCampaignWrite(formValues)
      return editing ? updateCampaign(id as string, body) : createCampaign(body)
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
      ])
      navigate(`/admin/campaigns/${result.campaign.id}`)
    },
  })
  const statusMutation = useMutation({
    mutationFn: (nextStatus: 'active' | 'paused') =>
      setCampaignStatus(id as string, nextStatus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
  const publicActions = usePublicReplyActions(id ?? '')
  const recoveryMutation = useMutation({
    mutationFn: () =>
      recoverDelivery(id as string, {
        commentId: recoveryCommentId.trim(),
        text: recoveryText.trim(),
      }),
    onSuccess: async () => {
      setRecoveryCommentId('')
      setRecoveryText('')
      await queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
  const campaign = campaignQuery.data?.campaign
  const selectedMedia = useMemo(
    () => mediaQuery.data?.media.find((media) => media.id === values.mediaId),
    [mediaQuery.data, values.mediaId],
  )
  const actionError =
    save.error ??
    statusMutation.error ??
    publicActions.backfill.error ??
    publicActions.retry.error ??
    recoveryMutation.error

  return {
    id,
    editing,
    campaign,
    media: mediaQuery.data?.media ?? [],
    selectedMedia,
    form,
    saveCampaign: (formValues) => save.mutate(formValues),
    savePending: save.isPending,
    statusPending: statusMutation.isPending,
    setStatus: (status) => statusMutation.mutate(status),
    actionError,
    actionPending:
      save.isPending ||
      statusMutation.isPending ||
      publicActions.backfill.isPending ||
      publicActions.retry.isPending ||
      recoveryMutation.isPending,
    backfillCount: campaign?.backfillablePublicReplyCount ?? 0,
    failedCount: campaign?.failedPublicReplyCount ?? 0,
    backfill: (expectedCount) => publicActions.backfill.mutate(expectedCount),
    retry: (expectedCount) => publicActions.retry.mutate(expectedCount),
    recoveryCommentId,
    setRecoveryCommentId,
    recoveryText,
    setRecoveryText,
    recoverDelivery: () => recoveryMutation.mutate(),
    confirmation,
    setConfirmation,
    campaignPending: editing && campaignQuery.isPending,
    campaignError: campaignQuery.error,
  }
}
