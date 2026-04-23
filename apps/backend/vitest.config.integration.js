import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.integration.spec.js"],
        exclude: ["tests/pact/**"],
    },
});
