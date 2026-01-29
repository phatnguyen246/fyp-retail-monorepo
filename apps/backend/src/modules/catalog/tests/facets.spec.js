import { describe, it, expect } from "vitest";
import { getFilterDef } from "../domain/specs/index.js";
import { mapFacetResults } from "../infrastructure/persistence/product.repository.mongo.js";

describe("facets mapping", () => {
    it("maps counts into filter buckets/options", () => {
        const filterDef = getFilterDef("computer");
        const raw = {
            ram_gb: [
                { _id: 8, count: 2 },
                { _id: 16, count: 3 },
                { _id: 32, count: 1 },
            ],
            cpu_brand: [
                { _id: "intel", count: 4 },
                { _id: "amd", count: 1 },
            ],
            is_touchscreen: [
                { _id: true, count: 2 },
            ],
        };

        const result = mapFacetResults({ filterDef, raw });

        const ramFilter = result.groups
            .flatMap((group) => group.filters)
            .find((filter) => filter.key === "ram_gb");

        const cpuFilter = result.groups
            .flatMap((group) => group.filters)
            .find((filter) => filter.key === "cpu_brand");

        const touchFilter = result.groups
            .flatMap((group) => group.filters)
            .find((filter) => filter.key === "is_touchscreen");

        expect(ramFilter.buckets.find((b) => b.min === 16).count).toBe(3);
        expect(cpuFilter.options.find((o) => o.value === "intel").count).toBe(4);
        expect(touchFilter.options.find((o) => o.value === true).count).toBe(2);
    });
});
