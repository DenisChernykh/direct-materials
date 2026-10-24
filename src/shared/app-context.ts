import type { Env } from '../env'
import type { AppRepositories } from '../composition/repositories'
import type { AppServices } from './services'

export type AppContext = {
  Bindings: Env
  Variables: {
    adminEmail: string
    repositories: AppRepositories
    services: AppServices
  }
}
