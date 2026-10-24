import type { NavigateFunction } from 'react-router-dom'

const oauthStartPath = '/oauth/instagram/start'

export function safeLoginNext(next: string | null | undefined): string {
  if (
    next === oauthStartPath ||
    next === '/admin' ||
    next?.startsWith('/admin/')
  )
    return next
  return '/admin'
}

/**
 * Worker-owned OAuth must be a document navigation so the Worker handles the
 * endpoint. SPA-owned admin paths remain client-side navigations.
 */
export function continueAfterLogin(
  next: string | null | undefined,
  navigate: NavigateFunction,
  assign: (url: string) => void,
): void {
  const target = safeLoginNext(next)
  if (target === oauthStartPath) {
    assign(target)
    return
  }
  navigate(target, { replace: true })
}
