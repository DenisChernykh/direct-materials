import app from './api'
import type { Env, InstagramEvent } from './env'
import { createRepositories } from './composition/repositories'
import { createProcessInstagramEvent } from './modules/deliveries/application/process-event'
import { createDeliveryUseCases } from './modules/deliveries/application'
import { createDeliveryEventRepository } from './modules/deliveries/infrastructure/event-repository'
import { instagramGateway } from './modules/deliveries/infrastructure/instagram-gateway'
import type { DeliveryEventGateway } from './modules/deliveries/application/process-event'

export function createWorker(deps: { gateway?: DeliveryEventGateway } = {}) {
  const gateway = deps.gateway ?? instagramGateway
  return {
    fetch: app.fetch,

    async queue(batch: MessageBatch<InstagramEvent>, env: Env): Promise<void> {
      const processInstagramEvent = createProcessInstagramEvent({
        repository: createDeliveryEventRepository(
          env.DB,
          env.TOKEN_ENCRYPTION_KEY,
        ),
        gateway,
      })
      for (const message of batch.messages) {
        try {
          await processInstagramEvent(message.body)
          message.ack()
        } catch (error) {
          console.error(
            JSON.stringify({
              event: 'instagram_event_failed',
              kind: message.body.kind,
              errorCode: error instanceof Error ? error.name : 'unknown_error',
            }),
          )
          message.retry({ delaySeconds: 60 })
        }
      }
    },

    async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
      const deleted = await createDeliveryUseCases(
        createRepositories(env).deliveries,
      ).cleanup()
      console.log(
        JSON.stringify({
          event: 'delivery_history_cleanup',
          deleted,
          retentionDays: 30,
        }),
      )
    },
  }
}

export default createWorker()

export { app }
export type { AppType } from './api'
