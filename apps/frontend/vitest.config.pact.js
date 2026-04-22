import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/pact/**/*.test.js'],
    reporters: ['default'],
    clearMocks: true,
  },
})
