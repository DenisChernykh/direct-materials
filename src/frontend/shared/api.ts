import { hc } from 'hono/client'
import type { AppType } from '../../api'

export type CampaignStatus = 'draft' | 'active' | 'paused'
export type CampaignTriggerMode = 'specific' | 'any' | 'next'
export type MatchMode = 'contains' | 'exact'
export type Campaign = {
  id: string
  name: string
  mediaId: string
  mediaPermalink: string | null
  triggerMode: CampaignTriggerMode
  armedAt: string | null
  matchMode: MatchMode
  keywords: string[]
  initialMessage: string
  initialButtonText: string
  followMessage: string
  recheckButtonText: string
  deliveryMessage: string
  unavailableMessage: string
  materialUrl: string
  publicReplyEnabled: boolean
  publicReplyVariants: string[]
  status: CampaignStatus
  revision: number
  createdAt: string
  updatedAt: string
  backfillablePublicReplyCount?: number
  failedPublicReplyCount?: number
}

export type Connection = {
  accountId: string
  username: string
  status: 'connected' | 'action_required' | 'disconnected'
  webhookSubscribed: boolean
  tokenExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type Delivery = {
  id: string
  campaignId: string
  campaignRevision: number
  commentId: string
  recipientId: string | null
  status:
    | 'received'
    | 'initial_dm_sent'
    | 'waiting_for_follow'
    | 'delivered'
    | 'failed'
    | 'unknown'
  publicReplyText: string | null
  publicReplyStatus: 'disabled' | 'pending' | 'sent' | 'failed' | 'unknown'
  publicReplyErrorCode: string | null
  errorCode: string | null
  createdAt: string
  updatedAt: string
  deliveredAt: string | null
  campaignName?: string
}

export type CampaignWrite = Omit<
  Campaign,
  'id' | 'status' | 'revision' | 'createdAt' | 'updatedAt' | 'armedAt'
>
export type Dashboard = {
  connection: Connection | null
  campaigns: Campaign[]
  counters: Record<string, number>
}
export type Media = {
  id: string
  caption: string | null
  mediaType: string | null
  timestamp: string | null
  permalink: string | null
}

const client = hc<AppType>('/')

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type JsonResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

async function result<T>(response: JsonResponse): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    T | { error?: { code?: string; message?: string } } | null
  if (!response.ok) {
    const error =
      data && typeof data === 'object' && 'error' in data
        ? data.error
        : undefined
    throw new ApiClientError(
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Не удалось выполнить запрос.',
      response.status,
    )
  }
  return data as T
}

export async function getSession() {
  return result<{ authenticated: boolean; email: string | null }>(
    await client.api.admin.session.$get(),
  )
}

export async function login(password: string) {
  return result<{ authenticated: boolean; email: string }>(
    await client.api.admin.session.$post({ json: { password } }),
  )
}

export async function logout() {
  if (typeof window !== 'undefined') {
    const response = await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'include',
    })
    return result<{ ok?: boolean }>(response)
  }
  return { ok: true }
}

export async function getDashboard() {
  return result<Dashboard>(await client.api.admin.dashboard.$get())
}

export async function getMedia() {
  return result<{ media: Media[] }>(await client.api.admin.media.$get())
}

export async function getCampaign(id: string) {
  return result<{ campaign: Campaign }>(
    await client.api.admin.campaigns[':id'].$get({ param: { id } }),
  )
}

export async function createCampaign(body: CampaignWrite) {
  return result<{ campaign: Campaign }>(
    await client.api.admin.campaigns.$post({ json: body }),
  )
}

export async function updateCampaign(id: string, body: CampaignWrite) {
  return result<{ campaign: Campaign }>(
    await client.api.admin.campaigns[':id'].$put({ param: { id }, json: body }),
  )
}

export async function setCampaignStatus(
  id: string,
  status: 'active' | 'paused',
) {
  return result<{ campaign: Campaign }>(
    await client.api.admin.campaigns[':id'].status.$put({
      param: { id },
      json: { status },
    }),
  )
}

export async function backfillPublicReplies(id: string, expectedCount: number) {
  return result<{ sent: number; failed: number }>(
    await client.api.admin.campaigns[':id']['public-replies'].backfill.$post({
      param: { id },
      json: { expectedCount },
    }),
  )
}

export async function retryPublicReplies(id: string, expectedCount: number) {
  return result<{ sent: number; failed: number }>(
    await client.api.admin.campaigns[':id']['public-replies'][
      'retry-failed'
    ].$post({ param: { id }, json: { expectedCount } }),
  )
}

export async function recoverDelivery(
  id: string,
  input: { commentId: string; text: string },
) {
  return result<{ queued: true }>(
    await client.api.admin.campaigns[':id'].deliveries.recover.$post({
      param: { id },
      json: input,
    }),
  )
}

export async function getHistory() {
  return result<{ deliveries: Delivery[] }>(
    await client.api.admin.history.$get(),
  )
}
