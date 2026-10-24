import { cloudflarePool, cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: 'src/index.ts',
      wrangler: { configPath: 'wrangler.jsonc' },
    }),
  ],
  test: {
    name: 'worker',
    include: ['test/worker/**/*.test.ts'],
    pool: cloudflarePool({
      main: 'src/index.ts',
      wrangler: { configPath: 'wrangler.jsonc' },
    }),
  },
})
