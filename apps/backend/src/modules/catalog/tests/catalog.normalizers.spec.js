import { describe, expect, it } from "vitest";
import {
    assertVariantPricingInvariant,
    assertVariantPricingPatchInvariant,
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeCsvStringArrayInput,
    normalizeSearchTitle,
    normalizeSku,
    normalizeTagCode,
    normalizeTitle,
    trimTextInput,
} from "../validation/index.js";

describe("catalog normalizers and invariants", () => {
    it("normalizes title and searchTitle with Vietnamese accents", () => {
        expect(normalizeTitle("  Điện   thoại  Samsung  ")).toBe(
            "Điện thoại Samsung"
        );
        expect(normalizeSearchTitle("Điện thoại Samsung Galaxy")).toBe(
            "dien thoai samsung galaxy"
        );
    });

    it("normalizes code fields with per-field semantics", () => {
        expect(normalizeSku(" ip16-blk-128 ")).toBe("IP16-BLK-128");
        expect(normalizeBrandCode(" apple ")).toBe("APPLE");
        expect(normalizeCategoryCode(" smartphone ")).toBe("SMARTPHONE");
        expect(normalizeTagCode(" Camera-Phone ")).toBe("camera-phone");
    });

    it("parses primitive CSV values without lossy numeric coercion", () => {
        expect(coerceBooleanInput("yes")).toBe(true);
        expect(coerceBooleanInput("0")).toBe(false);
        expect(coerceNumberInput("24990000")).toBe(24990000);
        expect(coerceIntegerInput("10")).toBe(10);
        expect(coerceIntegerInput("1.9")).toBe("1.9");
        expect(trimTextInput("   ")).toBeUndefined();
        expect(
            normalizeCsvStringArrayInput(" camera-phone, battery-phone, camera-phone ")
        ).toEqual(["camera-phone", "battery-phone"]);
    });

    it("enforces shared pricing invariants for complete and merged payloads", () => {
        expect(() =>
            assertVariantPricingInvariant({
                originalPrice: 24990000,
                salePrice: 22990000,
            })
        ).not.toThrow();

        expect(() =>
            assertVariantPricingInvariant({
                originalPrice: 22990000,
                salePrice: 24990000,
            })
        ).toThrow(/originalPrice/);

        expect(() =>
            assertVariantPricingPatchInvariant({
                currentValues: {
                    originalPrice: 24990000,
                    salePrice: 22990000,
                },
                patchValues: {
                    salePrice: 25990000,
                },
            })
        ).toThrow(/originalPrice/);
    });
});
