import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.{spec,test}.js"],
        exclude: [
            "src/**/*.integration.spec.js",
            "tests/pact/**",
        ],
    },
});
