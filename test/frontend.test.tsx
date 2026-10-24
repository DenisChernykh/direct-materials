// @vitest-environment jsdom
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/frontend/shared/api', async () => {
  const actual = await vi.importActual<
    typeof import('../src/frontend/shared/api')
  >('../src/frontend/shared/api')
  return {
    ...actual,
    getSession: vi
      .fn()
      .mockResolvedValue({ authenticated: false, email: null }),
  }
})

describe('React admin shell', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('renders the login route for an unauthenticated visitor', async () => {
    const { Root } = await import('../src/frontend/main')
    await act(async () => {
      window.history.pushState({}, '', '/login')
      document.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(document.body.textContent).toContain('С возвращением')
    expect(document.querySelector('input[type="password"]')).not.toBeNull()
    expect(Root).toBeDefined()
  })
})
