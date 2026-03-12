import { describe, expect, it } from "vitest";
import { generateProductSlug } from "../utils/generate-product-slug.js";

describe("generateProductSlug", () => {
    it("normalizes Vietnamese titles, whitespace, and casing consistently", () => {
        expect(generateProductSlug("  Điện   thoại   Samsung Galaxy  ")).toBe(
            "dien-thoai-samsung-galaxy"
        );
        expect(generateProductSlug("ĐIỆN thoại samsung galaxy")).toBe(
            "dien-thoai-samsung-galaxy"
        );
    });

    it("returns the same slug for equivalent normalized titles", () => {
        expect(generateProductSlug("iPhone 16 Pro")).toBe("iphone-16-pro");
        expect(generateProductSlug("  iphone   16   pro ")).toBe("iphone-16-pro");
    });
});
