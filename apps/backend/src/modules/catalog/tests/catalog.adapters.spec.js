import { describe, expect, it, vi } from "vitest";
import { createCatalogAdapters } from "../adapters/index.js";

describe("catalog adapters", () => {
    it("returns persistence adapters without storage when no bucket is injected", () => {
        const adapters = createCatalogAdapters();

        expect(adapters.persistence).toBeDefined();
        expect(adapters.persistence.baseRepository).toBeDefined();
        expect(adapters.persistence.mediaRepository).toBeDefined();
        expect(adapters).not.toHaveProperty("storage");
    });

    it("exposes the storage adapter when a bucket-like client is injected", () => {
        const storage = {
            bucket: {
                name: "catalog-assets",
                file: vi.fn(),
            },
        };

        const adapters = createCatalogAdapters({ storage });

        expect(adapters.persistence).toBeDefined();
        expect(adapters.storage).toBeDefined();
        expect(typeof adapters.storage.buildVariantImageStoragePath).toBe(
            "function"
        );
        expect(typeof adapters.storage.uploadVariantImage).toBe("function");
        expect(typeof adapters.storage.deleteVariantImage).toBe("function");
        expect(
            adapters.storage.buildVariantImageStoragePath({
                productId: "p123",
                variantId: "v456",
                fileName: "front.webp",
            })
        ).toBe("catalog/products/p123/variants/v456/front.webp");
    });
});
