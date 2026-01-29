// apps/backend/src/modules/catalog/application/helpers/buildSpecsKv.js

export function buildSpecsKv(mainSpecs = {}, specDef) {
    const specs = isPlainObject(mainSpecs) ? mainSpecs : {};
    const map = specDef?.map instanceof Map ? specDef.map : new Map();

    const entries = [];
    for (const [key, value] of Object.entries(specs)) {
        const def = map.get(key);
        if (!def) continue;

        const next = buildEntry(key, def.type, value);
        if (next) entries.push(next);
    }

    return entries;
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

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
