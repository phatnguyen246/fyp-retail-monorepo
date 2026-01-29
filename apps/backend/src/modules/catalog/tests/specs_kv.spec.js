import { describe, it, expect } from "vitest";
import { getSpecDef } from "../domain/specs/index.js";
import { normalizeMainSpecs } from "../application/helpers/normalizeMainSpecs.js";
import { buildSpecsKv } from "../application/helpers/buildSpecsKv.js";

describe("specs normalization", () => {
    it("normalizes main_specs and drops unknown keys", () => {
        const specDef = getSpecDef("computer");
        const normalized = normalizeMainSpecs(
            {
                ram_gb: "16",
                storage_gb: "512",
                cpu_brand: "Intel",
                is_touchscreen: "true",
                unknown: "drop",
                gpu_model: { name: "RTX" },
            },
            specDef
        );

        expect(normalized).toEqual({
            ram_gb: 16,
            storage_gb: 512,
            cpu_brand: "Intel",
            is_touchscreen: true,
        });
    });

    it("builds specs_kv with normalized values", () => {
        const specDef = getSpecDef("computer");
        const kv = buildSpecsKv(
            {
                ram_gb: 16,
                cpu_brand: "Intel",
                is_touchscreen: true,
            },
            specDef
        );

        expect(kv).toEqual(
            expect.arrayContaining([
                { k: "ram_gb", n: 16 },
                { k: "cpu_brand", s: "intel" },
                { k: "is_touchscreen", b: true },
            ])
        );
    });
});
