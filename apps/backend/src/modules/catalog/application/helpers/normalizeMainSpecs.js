// apps/backend/src/modules/catalog/application/helpers/normalizeMainSpecs.js

export function normalizeMainSpecs(rawSpecs = {}, specDef) {
    const specs = isPlainObject(rawSpecs) ? rawSpecs : {};
    const map = specDef?.map instanceof Map ? specDef.map : new Map();

    const normalized = {};
    for (const [key, value] of Object.entries(specs)) {
        const def = map.get(key);
        if (!def) continue;

        if (def.strategy === "set") {
            const items = Array.isArray(value) ? value : [value];
            const normalizedItems = items
                .map((item) => normalizeValue(def, item))
                .filter((item) => item !== undefined);

            const deduped = dedupeAndSort(normalizedItems, def.type);
            if (deduped.length) {
                normalized[key] = deduped;
            }
            continue;
        }

        const nextValue = normalizeValue(def, value);
        if (nextValue !== undefined) normalized[key] = nextValue;
    }

    return normalized;
}

function normalizeValue(def, value) {
    if (typeof def?.normalize === "function") {
        return def.normalize(value);
    }

    switch (def?.type) {
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

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
