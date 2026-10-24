import {
  createAdminSession,
  secureTextEqual,
  verifyAdminSession,
} from '../../security/admin-session'

export type AdminAuthService = {
  email: string
  getSession: (
    headers: Headers,
  ) => Promise<{ authenticated: boolean; email: string | null }>
  verifyPassword: (password: string) => Promise<boolean>
  createSession: () => Promise<string>
}

export function createAdminAuthService(config: {
  email: string
  password: string
  sessionKey: string
  localDevelopment?: boolean
}): AdminAuthService {
  return {
    email: config.email.toLowerCase(),
    async getSession(headers) {
      const accessEmail = headers
        .get('Cf-Access-Authenticated-User-Email')
        ?.toLowerCase()
      if (accessEmail) {
        const configuredEmail = config.email.toLowerCase()
        if (await secureTextEqual(accessEmail, configuredEmail))
          return { authenticated: true, email: configuredEmail }
        return { authenticated: false, email: null }
      }
      const cookie = headers
        .get('Cookie')
        ?.match(/(?:^|;\s*)direct_materials_admin=([^;]+)/)?.[1]
      const authenticated = cookie
        ? await verifyAdminSession(config.sessionKey, cookie)
        : false
      return {
        authenticated: authenticated || config.localDevelopment === true,
        email:
          authenticated || config.localDevelopment === true
            ? config.email.toLowerCase()
            : null,
      }
    },
    verifyPassword: (password) => secureTextEqual(password, config.password),
    createSession: () => createAdminSession(config.sessionKey),
  }
}
