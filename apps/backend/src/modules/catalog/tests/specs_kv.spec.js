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
            ram_gb: [16],
            storage_gb: [512],
            cpu_brand: "Intel",
            is_touchscreen: true,
        });
    });

    it("builds specs_kv with canonical spec.* keys", () => {
        const specDef = getSpecDef("computer");
        const kv = buildSpecsKv(
            {
                main_specs: {
                    ram_gb: 16,
                    cpu_brand: "Intel",
                    is_touchscreen: true,
                },
            },
            specDef
        );

        expect(kv).toEqual(
            expect.arrayContaining([
                { k: "spec.ram_gb", n: 16 },
                { k: "spec.cpu_brand", s: "intel" },
                { k: "spec.is_touchscreen", b: true },
            ])
        );
    });

    it("prefers option-derived values and builds agg price", () => {
        const specDef = getSpecDef("computer");
        const kv = buildSpecsKv(
            {
                main_specs: { ram_gb: 12 },
                options: [
                    {
                        id: "opt_ram",
                        code: "ram_gb",
                        values: [
                            { id: "ram8", value_code: "8", value_name: "8 GB" },
                            { id: "ram16", value_code: "16", value_name: "16 GB" },
                        ],
                    },
                ],
                variants: [
                    {
                        selections: [{ option_id: "opt_ram", option_value_id: "ram8" }],
                        price_amount: 18000000,
                    },
                    {
                        selections: [{ option_id: "opt_ram", option_value_id: "ram16" }],
                        price_amount: 22000000,
                    },
                ],
            },
            specDef
        );

        expect(kv).toEqual(
            expect.arrayContaining([
                { k: "spec.ram_gb", n: 8 },
                { k: "spec.ram_gb", n: 16 },
                { k: "agg.price_min", n: 18000000 },
                { k: "agg.price_max", n: 22000000 },
            ])
        );

        expect(kv.find((item) => item.k === "spec.ram_gb" && item.n === 12)).toBeUndefined();
    });

    it("falls back to main_specs when no option values exist", () => {
        const specDef = getSpecDef("computer");
        const kv = buildSpecsKv(
            {
                main_specs: { ram_gb: 12 },
                options: [],
                variants: [{ price_amount: 15000000, selections: [] }],
            },
            specDef
        );

        expect(kv).toEqual(
            expect.arrayContaining([
                { k: "spec.ram_gb", n: 12 },
                { k: "agg.price_min", n: 15000000 },
                { k: "agg.price_max", n: 15000000 },
            ])
        );
    });
});
