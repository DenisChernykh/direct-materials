import { z } from 'zod'
import type { Campaign, CampaignWrite } from '../shared/api'

export const defaultMessages = {
  initial:
    'Я подготовил материал. Нажмите «Получить», и я проверю подписку и сразу отправлю ссылку.',
  initialButton: 'Получить',
  follow:
    'Подпишитесь на аккаунт, затем нажмите «Проверить подписку» — я сразу отправлю материал.',
  recheckButton: 'Проверить подписку',
  delivery: 'Спасибо за подписку! Ваш материал:',
  unavailable:
    'Сейчас не удалось проверить подписку. Попробуйте ещё раз через минуту.',
}

export const defaultPublicReplies = [
  'Отправила в Direct 💌',
  'Готово — проверь сообщения 🙌',
  'Уже отправила, загляни в Direct ✨',
  'Лови, всё в сообщениях 🚀',
]

export const campaignFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название.').max(100),
    triggerMode: z.enum(['specific', 'any', 'next']),
    mediaId: z.string().trim().max(300),
    matchMode: z.enum(['contains', 'exact']),
    keywordsText: z
      .string()
      .trim()
      .min(1, 'Добавьте хотя бы одно ключевое слово.'),
    publicReplyEnabled: z.boolean(),
    publicReplyVariantsText: z.string(),
    initialMessage: z.string().trim().min(1).max(900),
    initialButtonText: z.string().trim().min(1).max(20),
    followMessage: z.string().trim().min(1).max(900),
    recheckButtonText: z.string().trim().min(1).max(20),
    deliveryMessage: z.string().trim().min(1).max(900),
    unavailableMessage: z.string().trim().min(1).max(900),
    materialUrl: z
      .string()
      .url('Укажите корректную ссылку.')
      .refine((value) => value.startsWith('https://'), 'Нужна HTTPS-ссылка.'),
  })
  .superRefine((value, context) => {
    if (value.triggerMode === 'specific' && !value.mediaId.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['mediaId'],
        message: 'Выберите публикацию для этого режима.',
      })
    }
    const variants = splitLines(value.publicReplyVariantsText)
    if (value.publicReplyEnabled && variants.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['publicReplyVariantsText'],
        message: 'Добавьте хотя бы один вариант публичного ответа.',
      })
    }
    if (variants.length > 10) {
      context.addIssue({
        code: 'custom',
        path: ['publicReplyVariantsText'],
        message: 'Можно добавить не больше 10 вариантов.',
      })
    }
  })

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

export const emptyCampaignForm: CampaignFormValues = {
  name: '',
  triggerMode: 'specific',
  mediaId: '',
  matchMode: 'contains',
  keywordsText: '',
  publicReplyEnabled: true,
  publicReplyVariantsText: defaultPublicReplies.join('\n'),
  initialMessage: defaultMessages.initial,
  initialButtonText: defaultMessages.initialButton,
  followMessage: defaultMessages.follow,
  recheckButtonText: defaultMessages.recheckButton,
  deliveryMessage: defaultMessages.delivery,
  unavailableMessage: defaultMessages.unavailable,
  materialUrl: '',
}

export function campaignToForm(campaign: Campaign): CampaignFormValues {
  return {
    name: campaign.name,
    triggerMode: campaign.triggerMode,
    mediaId: campaign.mediaId,
    matchMode: campaign.matchMode,
    keywordsText: campaign.keywords.join('\n'),
    publicReplyEnabled: campaign.publicReplyEnabled,
    publicReplyVariantsText: campaign.publicReplyVariants.join('\n'),
    initialMessage: campaign.initialMessage,
    initialButtonText: campaign.initialButtonText,
    followMessage: campaign.followMessage,
    recheckButtonText: campaign.recheckButtonText,
    deliveryMessage: campaign.deliveryMessage,
    unavailableMessage: campaign.unavailableMessage,
    materialUrl: campaign.materialUrl,
  }
}

export function formToCampaignWrite(values: CampaignFormValues): CampaignWrite {
  return {
    name: values.name.trim(),
    mediaId: values.triggerMode === 'specific' ? values.mediaId.trim() : '',
    mediaPermalink: null,
    triggerMode: values.triggerMode,
    matchMode: values.matchMode,
    keywords: splitLines(values.keywordsText),
    initialMessage: values.initialMessage.trim(),
    initialButtonText: values.initialButtonText.trim(),
    followMessage: values.followMessage.trim(),
    recheckButtonText: values.recheckButtonText.trim(),
    deliveryMessage: values.deliveryMessage.trim(),
    unavailableMessage: values.unavailableMessage.trim(),
    materialUrl: values.materialUrl.trim(),
    publicReplyEnabled: values.publicReplyEnabled,
    publicReplyVariants: splitLines(values.publicReplyVariantsText),
  }
}

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function mediaLabel(item: {
  caption: string | null
  mediaType: string | null
  timestamp: string | null
}): string {
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('ru-RU')
    : 'без даты'
  const caption =
    item.caption?.replace(/\s+/g, ' ').slice(0, 72) ||
    item.mediaType ||
    'Публикация'
  return `${date} — ${caption}`
}
