// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../src/frontend/app/router'
import { AppShell } from '../src/frontend/app/shell'
import { DashboardPage } from '../src/frontend/pages/dashboard'
import { HistoryPage } from '../src/frontend/pages/history'
import { CampaignEditor } from '../src/frontend/pages/campaign-editor'
import { LoginPage } from '../src/frontend/pages/login'
import { continueAfterLogin } from '../src/frontend/shared/navigation'

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const api = vi.hoisted(() => ({
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getDashboard: vi.fn(),
  getMedia: vi.fn(),
  getCampaign: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  setCampaignStatus: vi.fn(),
  backfillPublicReplies: vi.fn(),
  retryPublicReplies: vi.fn(),
  recoverDelivery: vi.fn(),
  getHistory: vi.fn(),
}))

vi.mock('../src/frontend/shared/api', () => ({
  ...api,
  ApiClientError: class ApiClientError extends Error {},
}))

const campaign = {
  id: 'campaign-1',
  name: 'Guide',
  mediaId: 'media-1',
  mediaPermalink: null,
  triggerMode: 'specific' as const,
  armedAt: null,
  matchMode: 'contains' as const,
  keywords: ['guide'],
  initialMessage: 'Here',
  initialButtonText: 'Get',
  followMessage: 'Follow',
  recheckButtonText: 'Check',
  deliveryMessage: 'Material',
  unavailableMessage: 'Try later',
  materialUrl: 'https://example.com/material',
  publicReplyEnabled: true,
  publicReplyVariants: ['Sent'],
  status: 'draft' as const,
  revision: 1,
  createdAt: '2026-08-26T10:00:00',
  updatedAt: '2026-08-26T10:00:00',
  backfillablePublicReplyCount: 2,
  failedPublicReplyCount: 0,
}

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
})

async function render(element: ReactNode, path = '/') {
  document.body.innerHTML = '<div id="root"></div>'
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  root = createRoot(document.getElementById('root')!)
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
      </QueryClientProvider>,
    )
  })
  for (let index = 0; index < 4; index += 1)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
}

function campaignRoute() {
  return (
    <Routes>
      <Route path="/admin/campaigns/new" element={<CampaignEditor />} />
      <Route path="/admin/campaigns/:id" element={<CampaignEditor />} />
    </Routes>
  )
}

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  )
}

function setInputValue(selector: string, value: string) {
  const input = document.querySelector(selector) as
    HTMLInputElement | HTMLTextAreaElement
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getSession.mockResolvedValue({
    authenticated: true,
    email: 'owner@example.com',
  })
  api.getMedia.mockResolvedValue({ media: [] })
  api.setCampaignStatus.mockResolvedValue({ campaign })
  api.backfillPublicReplies.mockResolvedValue({ sent: 2, failed: 0 })
  api.recoverDelivery.mockResolvedValue({ queued: true })
  api.getDashboard.mockResolvedValue({
    connection: null,
    campaigns: [campaign],
    counters: { delivered: 3 },
  })
  api.getCampaign.mockResolvedValue({ campaign })
  api.getHistory.mockResolvedValue({ deliveries: [] })
  api.login.mockResolvedValue({
    authenticated: true,
    email: 'owner@example.com',
  })
  api.logout.mockResolvedValue({ ok: true })
  api.createCampaign.mockResolvedValue({ campaign })
  api.updateCampaign.mockResolvedValue({ campaign })
  window.history.pushState({}, '', '/')
})

describe('React operator flows', () => {
  it('uses a full document navigation for the Worker-owned OAuth continuation', () => {
    const navigate = vi.fn()
    const assign = vi.fn()
    continueAfterLogin('/oauth/instagram/start', navigate, assign)
    expect(assign).toHaveBeenCalledWith('/oauth/instagram/start')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('preserves an internal admin deep link in the login redirect', async () => {
    api.getSession.mockResolvedValue({ authenticated: false, email: null })
    await render(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      '/admin/campaigns/campaign-1?x=one&next=https%3A%2F%2Fevil.example',
    )
    expect(document.body.textContent).toContain('С возвращением')
    const location = document.querySelector('[data-testid="location"]')
    expect(location?.textContent).toBe(
      '/login?next=%2Fadmin%2Fcampaigns%2Fcampaign-1%3Fx%3Done%26next%3Dhttps%253A%252F%252Fevil.example',
    )
  })

  it('continues to an internal admin route after login while rejecting external next values', () => {
    const navigate = vi.fn()
    const assign = vi.fn()
    continueAfterLogin('/admin/campaigns/campaign-1?x=one', navigate, assign)
    expect(navigate).toHaveBeenCalledWith('/admin/campaigns/campaign-1?x=one', {
      replace: true,
    })
    continueAfterLogin('https://evil.example', navigate, assign)
    expect(navigate).toHaveBeenLastCalledWith('/admin', { replace: true })
    expect(assign).not.toHaveBeenCalled()
  })

  it('redirects an anonymous visitor to login', async () => {
    api.getSession.mockResolvedValue({ authenticated: false, email: null })
    await render(<AppRoutes />, '/admin')
    expect(document.body.textContent).toContain('С возвращением')
  })

  it('renders dashboard data and links to campaign editing', async () => {
    await render(<AppRoutes />, '/admin')
    expect(document.body.textContent).toContain('Guide')
    expect(
      document.querySelector('a[href="/admin/campaigns/campaign-1"]'),
    ).not.toBeNull()
  })

  it('filters the recent delivery list in the browser', async () => {
    api.getHistory.mockResolvedValue({
      deliveries: [
        {
          id: 'd1',
          campaignId: 'c1',
          campaignRevision: 1,
          commentId: 'comment-a',
          recipientId: null,
          status: 'delivered',
          publicReplyText: null,
          publicReplyStatus: 'disabled',
          publicReplyErrorCode: null,
          errorCode: null,
          createdAt: '2026-08-26T10:00:00',
          updatedAt: '2026-08-26T10:00:00',
          deliveredAt: null,
          campaignName: 'Guide',
        },
        {
          id: 'd2',
          campaignId: 'c2',
          campaignRevision: 1,
          commentId: 'comment-b',
          recipientId: null,
          status: 'failed',
          publicReplyText: null,
          publicReplyStatus: 'failed',
          publicReplyErrorCode: 'provider_error',
          errorCode: 'provider_error',
          createdAt: '2026-08-26T11:00:00',
          updatedAt: '2026-08-26T11:00:00',
          deliveredAt: null,
          campaignName: 'Other',
        },
      ],
    })
    await render(<HistoryPage />)
    expect(document.body.textContent).toContain('Guide')
    const select = document.querySelector('select') as HTMLSelectElement
    await act(async () => {
      select.value = 'delivered'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(document.body.textContent).toContain('Guide')
    expect(document.body.textContent).not.toContain('Other')
  })

  it('keeps mass public reply action behind an accessible alert dialog', async () => {
    await render(campaignRoute(), '/admin/campaigns/campaign-1')
    const action = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Ответить под старыми'),
    )
    expect(action).toBeDefined()
    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(document.body.textContent).toContain('Подтвердите действие')
    expect(api.backfillPublicReplies).not.toHaveBeenCalled()
    const continueButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Продолжить'),
    )
    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(api.backfillPublicReplies).toHaveBeenCalledWith('campaign-1', 2)
  })

  it('queues one missed comment through the confirmed recovery action', async () => {
    api.getCampaign.mockResolvedValue({
      campaign: { ...campaign, status: 'active' },
    })
    await render(campaignRoute(), '/admin/campaigns/campaign-1')
    await act(async () => {
      setInputValue('#recovery-comment-id', '18083879864430633')
      setInputValue('#recovery-comment-text', 'Блог - тур')
    })
    const action = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Восстановить доставку'),
    )
    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(api.recoverDelivery).not.toHaveBeenCalled()
    const continueButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Продолжить'),
    )
    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(api.recoverDelivery).toHaveBeenCalledWith('campaign-1', {
      commentId: '18083879864430633',
      text: 'Блог - тур',
    })
  })

  it('submits login and logout through the session feature', async () => {
    await render(<LoginPage />, '/login')
    const username = document.querySelector('#username') as HTMLInputElement
    expect(username).toMatchObject({ readOnly: true, tabIndex: -1 })
    expect(username.getAttribute('autocomplete')).toBe('username')
    expect(username.getAttribute('aria-hidden')).toBe('true')
    await act(async () => {
      setInputValue('#password', 'secret')
      ;(
        document.querySelector('button[type="submit"]') as HTMLButtonElement
      )?.click()
    })
    for (let index = 0; index < 3; index += 1)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
    expect(api.login).toHaveBeenCalledWith('secret')

    await render(<AppRoutes />, '/admin')
    const logout = document.querySelector('button[title="Выйти"]')
    expect(logout).not.toBeNull()
    await act(async () => {
      logout?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(api.logout).toHaveBeenCalledOnce()
  })

  it('closes the mobile Sheet when a navigation item changes the route', async () => {
    await render(<AppShell />, '/admin')
    const trigger = document.querySelector(
      '[data-slot="sheet-trigger"]',
    ) as HTMLButtonElement
    await act(async () => {
      trigger.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const content = document.querySelector('[data-slot="sheet-content"]')
    expect(content).not.toBeNull()
    const historyLink = content?.querySelector(
      'a[href="/admin/history"]',
    ) as HTMLAnchorElement
    await act(async () => {
      historyLink.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull()
  })

  it('submits create, update, and explicit status commands', async () => {
    await render(campaignRoute(), '/admin/campaigns/new')
    await act(async () => {
      setInputValue('#campaign-name', 'New campaign')
      setInputValue('#campaign-keywords', 'guide')
      setInputValue('#campaign-media-id', 'media-1')
      setInputValue('#campaign-material-url', 'https://example.com/material')
      ;(
        document.querySelector('button[type="submit"]') as HTMLButtonElement
      )?.click()
    })
    expect(api.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New campaign' }),
    )
    expect(api.createCampaign.mock.calls[0]?.[0]).not.toHaveProperty('status')

    await render(campaignRoute(), '/admin/campaigns/campaign-1')
    await act(async () => {
      ;(
        document.querySelector('button[type="submit"]') as HTMLButtonElement
      )?.click()
    })
    expect(api.updateCampaign).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({ name: 'Guide' }),
    )
    const activate = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Активировать'),
    )
    await act(async () => {
      activate?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(api.setCampaignStatus).toHaveBeenCalledWith('campaign-1', 'active')
  })

  it('does not render raw provider errors in the operator UI', async () => {
    api.getDashboard.mockRejectedValue(new Error('token=secret'))
    await render(<DashboardPage />)
    expect(document.body.textContent).not.toContain('token=secret')
    expect(document.body.textContent).toContain('Произошла ошибка')
  })
})
