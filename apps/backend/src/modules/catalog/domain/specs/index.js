// apps/backend/src/modules/catalog/domain/specs/index.js
import { smartphoneSpecs } from "./smartphone.specs.js";
import { computerSpecs } from "./computer.specs.js";
import { smartphoneFilters } from "./smartphone.filters.js";
import { computerFilters } from "./computer.filters.js";

const SPEC_REGISTRY = new Map([
    ["smartphone", smartphoneSpecs],
    ["computer", computerSpecs],
]);

const FILTER_REGISTRY = new Map([
    ["smartphone", smartphoneFilters],
    ["computer", computerFilters],
]);

export function normalizeProductType(product_type) {
    const type = String(product_type ?? "").trim().toLowerCase();
    return type.length ? type : null;
}

export function getSpecDef(product_type) {
    const type = normalizeProductType(product_type);
    if (!type) return null;

    const specs = SPEC_REGISTRY.get(type);
    if (!specs) return null;

    return {
        product_type: type,
        specs,
        map: new Map(specs.map((spec) => [spec.key, spec])),
    };
}

export function getFilterDef(product_type) {
    const type = normalizeProductType(product_type);
    if (!type) return null;

    return FILTER_REGISTRY.get(type) ?? null;
}

export function listProductTypes() {
    return Array.from(SPEC_REGISTRY.keys());
}
