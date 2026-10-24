import type { AdminAuthService } from '../modules/admin-auth/application'
import type { PublicReplyUseCases } from '../modules/deliveries/application/public-replies'
import type { InstagramConnectionHttpService } from '../modules/instagram-connection/application'

export type AppServices = {
  adminAuth: AdminAuthService
  instagram: InstagramConnectionHttpService
  publicReplies: PublicReplyUseCases
}
