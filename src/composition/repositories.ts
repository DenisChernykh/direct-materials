import type { Env } from '../env'
import { createCampaignRepository } from '../modules/campaigns/infrastructure/repository'
import { createDeliveryRepository } from '../modules/deliveries/infrastructure/repository'
import { createInstagramConnectionRepository } from '../modules/instagram-connection/infrastructure/repository'
import { listAvailableMedia } from '../modules/instagram-connection/infrastructure/media-repository'

export type AppRepositories = {
  campaigns: ReturnType<typeof createCampaignRepository>
  deliveries: ReturnType<typeof createDeliveryRepository>
  instagram: ReturnType<typeof createInstagramConnectionRepository>
}

export function createRepositories(env: Env): AppRepositories {
  return {
    campaigns: createCampaignRepository(env.DB),
    deliveries: createDeliveryRepository(env.DB),
    instagram: createInstagramConnectionRepository(env.DB, () =>
      listAvailableMedia(env),
    ),
  }
}
