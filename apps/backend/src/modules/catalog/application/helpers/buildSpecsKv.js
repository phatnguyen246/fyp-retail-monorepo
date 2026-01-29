// apps/backend/src/modules/catalog/application/helpers/buildSpecsKv.js
import { extractOptionSpecs } from "./extractOptionSpecs.js";

const SPEC_PREFIX = "spec.";
const AGG_PRICE_MIN = "agg.price_min";
const AGG_PRICE_MAX = "agg.price_max";

export function buildSpecsKv(product = {}, specDef) {
    const mainSpecs = isPlainObject(product?.main_specs)
        ? product.main_specs
        : isPlainObject(product)
            ? product
            : {};

    const options = Array.isArray(product?.options) ? product.options : [];
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const specs = Array.isArray(specDef?.specs) ? specDef.specs : [];

    const optionSpecs = extractOptionSpecs({ options, variants, specDef });

    const entries = [];
    for (const spec of specs) {
        if (!spec?.key || !spec?.type) continue;

        const raw = typeof spec.extract === "function"
            ? spec.extract({ mainSpecs, optionSpecs, product })
            : mainSpecs?.[spec.key];

        if (spec.strategy === "set") {
            const values = normalizeValues(raw, spec);
            for (const value of values) {
                const entry = buildEntry(`${SPEC_PREFIX}${spec.key}`, spec.type, value);
                if (entry) entries.push(entry);
            }
            continue;
        }

        const single = normalizeSingleValue(raw, spec);
        const entry = buildEntry(`${SPEC_PREFIX}${spec.key}`, spec.type, single);
        if (entry) entries.push(entry);
    }

    const priceAgg = buildPriceAgg({ variants, product });
    if (priceAgg) {
        if (Number.isFinite(priceAgg.min)) {
            entries.push({ k: AGG_PRICE_MIN, n: priceAgg.min });
        }
        if (Number.isFinite(priceAgg.max)) {
            entries.push({ k: AGG_PRICE_MAX, n: priceAgg.max });
        }
    }

    return entries;
}

function normalizeValues(raw, spec) {
    const items = Array.isArray(raw) ? raw : [raw];
    const normalized = items
        .map((item) => normalizeValue(spec, item))
        .filter((item) => item !== undefined);

    return dedupeAndSort(normalized, spec.type);
}

function normalizeSingleValue(raw, spec) {
    if (Array.isArray(raw)) {
        const values = normalizeValues(raw, spec);
        return values.length ? values[0] : undefined;
    }
    return normalizeValue(spec, raw);
}

function normalizeValue(spec, value) {
    if (typeof spec?.normalize === "function") {
        return spec.normalize(value);
    }

    switch (spec?.type) {
        case "number":
            return normalizeNumber(value);
        case "boolean":
            return normalizeBoolean(value);
        case "string":
            return normalizeString(value);
        default:
            return undefined;
    }
}

function buildEntry(key, type, value) {
    switch (type) {
        case "number": {
            if (typeof value === "number" && Number.isFinite(value)) {
                return { k: key, n: value };
            }
            return null;
        }
        case "boolean": {
            if (typeof value === "boolean") {
                return { k: key, b: value };
            }
            return null;
        }
        case "string": {
            if (value == null) return null;
            const normalized = String(value).trim().toLowerCase();
            if (!normalized) return null;
            return { k: key, s: normalized };
        }
        default:
            return null;
    }
}

function buildPriceAgg({ variants, product }) {
    const prices = Array.isArray(variants)
        ? variants
            .map((v) => toNumber(v?.price_amount))
            .filter((v) => Number.isFinite(v))
        : [];

    if (prices.length) {
        return {
            min: Math.min(...prices),
            max: Math.max(...prices),
        };
    }

    const fallback = toNumber(product?.price_amount ?? product?.price);
    if (Number.isFinite(fallback)) {
        return { min: fallback, max: fallback };
    }

    return null;
}

function normalizeNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function normalizeBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true" || trimmed === "1" || trimmed === "yes") return true;
        if (trimmed === "false" || trimmed === "0" || trimmed === "no") return false;
    }
    return undefined;
}

function normalizeString(value) {
    if (value == null) return undefined;
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        const asString = String(value).trim();
        return asString.length ? asString : undefined;
    }
    return undefined;
}

function dedupeAndSort(values, type) {
    const seen = new Set();
    const deduped = [];
    for (const value of values) {
        const key = type === "string" ? String(value).toLowerCase() : String(value);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(value);
    }

    if (type === "number") {
        return deduped.sort((a, b) => a - b);
    }
    if (type === "boolean") {
        return deduped.sort((a, b) => Number(a) - Number(b));
    }
    return deduped.sort((a, b) => String(a).localeCompare(String(b)));
}

function toNumber(value) {
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : undefined;
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
