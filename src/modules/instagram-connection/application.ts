export type InstagramConnection = {
  accountId: string
  username: string
  status: 'connected' | 'action_required' | 'disconnected'
  webhookSubscribed: boolean
  tokenExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type InstagramEvent =
  | {
      kind: 'comment'
      accountId: string
      commentId: string
      mediaId: string
      text: string
    }
  | {
      kind: 'action'
      accountId: string
      recipientId: string
      eventId: string
      payload: string
    }

export type InstagramConnectionInput = {
  accountId: string
  username: string
  tokenCiphertext: string
  tokenIv: string
  tokenExpiresAt: string | null
  permissions: string[]
  status: 'connected' | 'action_required' | 'disconnected'
  webhookSubscribed: boolean
}
export type InstagramMedia = {
  id: string
  caption: string | null
  mediaType: string | null
  timestamp: string | null
  permalink: string | null
}
export type InstagramConnectionRepository = {
  get: () => Promise<InstagramConnection | null>
  getConnectedToken: (
    encryptionKey: string,
  ) => Promise<{ accountId: string; token: string } | null>
  listMedia: () => Promise<InstagramMedia[]>
  save: (input: InstagramConnectionInput) => Promise<void>
}

export function createInstagramConnectionUseCases(
  repository: InstagramConnectionRepository,
) {
  return {
    get: () => repository.get(),
    listMedia: () => repository.listMedia(),
    save: (input: InstagramConnectionInput) => repository.save(input),
  }
}

export type InstagramConnectionHttpService = {
  verifyWebhook: (input: {
    mode?: string
    token?: string
    challenge?: string
  }) => string | null
  receiveWebhook: (
    rawBody: string,
    signature: string | undefined,
  ) => Promise<{ status: number; accepted?: number; message?: string }>
  startOAuth: () => Promise<string>
  completeOAuth: (
    code: string | undefined,
    state: string | undefined,
  ) => Promise<{ status: number; redirect?: string; message: string }>
}
