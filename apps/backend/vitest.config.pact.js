import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/pact/**/*.test.js"],
        testTimeout: 20000,
    },
});
