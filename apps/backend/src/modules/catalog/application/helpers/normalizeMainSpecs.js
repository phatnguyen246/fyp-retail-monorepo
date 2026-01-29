// apps/backend/src/modules/catalog/application/helpers/normalizeMainSpecs.js

export function normalizeMainSpecs(rawSpecs = {}, specDef) {
    const specs = isPlainObject(rawSpecs) ? rawSpecs : {};
    const map = specDef?.map instanceof Map ? specDef.map : new Map();

    const normalized = {};
    for (const [key, value] of Object.entries(specs)) {
        const def = map.get(key);
        if (!def) continue;

        const nextValue = normalizeValue(def.type, value);
        if (nextValue !== undefined) {
            normalized[key] = nextValue;
        }
    }

    return normalized;
}

function normalizeValue(type, value) {
    switch (type) {
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

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
