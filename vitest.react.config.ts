import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'react',
    include: ['test/frontend*.test.tsx'],
    environment: 'jsdom',
  },
})
