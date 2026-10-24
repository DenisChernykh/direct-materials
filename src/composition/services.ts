import type { Env } from '../env'
import { createAdminAuthService } from '../modules/admin-auth/application'
import { createPublicReplyUseCases } from '../modules/deliveries/application/public-replies'
import { instagramGateway } from '../modules/deliveries/infrastructure/instagram-gateway'
import { createInstagramConnectionHttpService } from '../modules/instagram-connection/infrastructure/http-service'
import type { AppServices } from '../shared/services'
import { createRepositories } from './repositories'

export function createServices(env: Env): AppServices {
  const repositories = createRepositories(env)
  return {
    adminAuth: createAdminAuthService({
      email: env.ADMIN_EMAIL ?? '',
      password: env.ADMIN_PASSWORD ?? '',
      sessionKey: env.ADMIN_SESSION_KEY ?? '',
      localDevelopment: env.LOCAL_DEVELOPMENT === 'true',
    }),
    instagram: createInstagramConnectionHttpService(env),
    publicReplies: createPublicReplyUseCases({
      campaigns: repositories.campaigns,
      deliveries: repositories.deliveries,
      connection: repositories.instagram,
      gateway: instagramGateway,
      encryptionKey: env.TOKEN_ENCRYPTION_KEY,
    }),
  }
}
