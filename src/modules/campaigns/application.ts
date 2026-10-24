export type CampaignStatus = 'draft' | 'active' | 'paused'
export type CampaignTriggerMode = 'specific' | 'any' | 'next'
export type Campaign = {
  id: string
  name: string
  mediaId: string
  mediaPermalink: string | null
  triggerMode: CampaignTriggerMode
  armedAt: string | null
  matchMode: 'contains' | 'exact'
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
}
/** Fields accepted by create/update HTTP commands. Identity and lifecycle are not caller input. */
export type CampaignWrite = Omit<
  Campaign,
  | 'id'
  | 'status'
  | 'revision'
  | 'createdAt'
  | 'updatedAt'
  | 'armedAt'
  | 'mediaPermalink'
> & {
  mediaPermalink: string | null
}

/** Internal persistence command assembled by the use case. */
export type CampaignMutation = CampaignWrite & {
  id?: string
  status: CampaignStatus
}

export type CampaignRepository = {
  list: () => Promise<Campaign[]>
  get: (id: string) => Promise<Campaign | null>
  save: (input: CampaignMutation) => Promise<string>
  setStatus: (id: string, status: CampaignStatus) => Promise<void>
  findStatusConflict: (
    id: string,
    mode: CampaignTriggerMode,
  ) => Promise<Campaign | null>
  counters: () => Promise<Record<string, number>>
}

export type CampaignConnectionPort = {
  get: () => Promise<{
    status: 'connected' | 'action_required' | 'disconnected'
    webhookSubscribed: boolean
  } | null>
}

export class CampaignUseCaseError extends Error {
  constructor(
    readonly code:
      'VALIDATION_FAILED' | 'NOT_FOUND' | 'CONFLICT' | 'DEPENDENCY_UNAVAILABLE',
    message: string,
  ) {
    super(message)
    this.name = 'CampaignUseCaseError'
  }
}

/** Use cases own campaign reads/writes; presentation only translates HTTP. */
export function createCampaignUseCases(deps: {
  repository: CampaignRepository
  connection: CampaignConnectionPort
}) {
  const { repository } = deps
  return {
    dashboard: () => Promise.all([repository.list(), repository.counters()]),
    get: (id: string) => repository.get(id),
    createDraft: async (input: CampaignWrite) => {
      if (input.triggerMode === 'specific' && !input.mediaId)
        throw new CampaignUseCaseError(
          'VALIDATION_FAILED',
          'Укажите публикацию для этого режима.',
        )
      return repository.save({ ...input, status: 'draft' })
    },
    update: async (id: string, input: CampaignWrite) => {
      const current = await repository.get(id)
      if (!current)
        throw new CampaignUseCaseError('NOT_FOUND', 'Кампания не найдена.')
      if (
        current.status === 'active' &&
        current.triggerMode !== input.triggerMode
      )
        throw new CampaignUseCaseError(
          'CONFLICT',
          'Приостановите кампанию перед сменой режима публикации.',
        )
      return repository.save({ ...input, id, status: current.status })
    },
    setStatus: async (id: string, status: Exclude<CampaignStatus, 'draft'>) => {
      const current = await repository.get(id)
      if (!current)
        throw new CampaignUseCaseError('NOT_FOUND', 'Кампания не найдена.')
      if (status === 'active') {
        const connection = await deps.connection.get()
        if (
          !connection ||
          connection.status !== 'connected' ||
          !connection.webhookSubscribed
        )
          throw new CampaignUseCaseError(
            'DEPENDENCY_UNAVAILABLE',
            'Сначала подключите Instagram и webhook.',
          )
        const conflict = await repository.findStatusConflict(
          id,
          current.triggerMode,
        )
        if (conflict)
          throw new CampaignUseCaseError(
            'CONFLICT',
            `Уже активна кампания «${conflict.name}».`,
          )
      }
      return repository.setStatus(id, status)
    },
  }
}
