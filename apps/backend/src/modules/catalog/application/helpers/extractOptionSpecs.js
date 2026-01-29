// apps/backend/src/modules/catalog/application/helpers/extractOptionSpecs.js

export function extractOptionSpecs({ options = [], variants = [], specDef } = {}) {
    const specs = Array.isArray(specDef?.specs) ? specDef.specs : [];
    const optionCodeToSpec = buildOptionCodeMap(specs);

    const optionById = new Map();
    const optionByCode = new Map();

    for (const option of options) {
        const code = normalizeCode(option?.code);
        if (code) optionByCode.set(code, option);

        const valuesById = new Map();
        const values = Array.isArray(option?.values) ? option.values : [];
        for (const value of values) {
            const id = String(value?.id ?? "").trim();
            if (id) valuesById.set(id, value);
        }

        const id = String(option?.id ?? "").trim();
        if (id) optionById.set(id, { option, valuesById });
    }

    const result = new Map();

    if (Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
            const selections = Array.isArray(variant?.selections) ? variant.selections : [];
            for (const selection of selections) {
                const optionId = String(selection?.option_id ?? "").trim();
                const valueId = String(selection?.option_value_id ?? "").trim();
                if (!optionId || !valueId) continue;

                const resolved = optionById.get(optionId);
                if (!resolved) continue;
                const option = resolved.option;
                const value = resolved.valuesById.get(valueId);
                if (!value) continue;

                const spec = resolveSpec(option, optionCodeToSpec);
                if (!spec) continue;

                const normalized = normalizeOptionValue(value, spec);
                addUniqueValue(result, spec, normalized);
            }
        }
    } else {
        for (const option of options) {
            const spec = resolveSpec(option, optionCodeToSpec);
            if (!spec) continue;

            const values = Array.isArray(option?.values) ? option.values : [];
            for (const value of values) {
                const normalized = normalizeOptionValue(value, spec);
                addUniqueValue(result, spec, normalized);
            }
        }
    }

    const output = {};
    for (const [key, payload] of result.entries()) {
        output[key] = payload.values;
    }
    return output;
}

function buildOptionCodeMap(specs) {
    const map = new Map();
    for (const spec of specs) {
        if (spec?.source !== "options" && spec?.source !== "either") continue;
        const codes = Array.isArray(spec?.option_codes) && spec.option_codes.length
            ? spec.option_codes
            : [spec.key];

        for (const code of codes) {
            const normalized = normalizeCode(code);
            if (normalized) map.set(normalized, spec);
        }
    }
    return map;
}

function resolveSpec(option, optionCodeToSpec) {
    const code = normalizeCode(option?.code);
    if (!code) return null;
    return optionCodeToSpec.get(code) ?? null;
}

function normalizeOptionValue(rawValue, spec) {
    if (typeof spec?.normalize === "function") {
        return spec.normalize(rawValue);
    }

    if (spec?.type === "number") return normalizeNumberFromOption(rawValue);
    if (spec?.type === "boolean") return normalizeBooleanFromOption(rawValue);
    if (spec?.type === "string") return normalizeStringFromOption(rawValue);
    return undefined;
}

function normalizeNumberFromOption(rawValue) {
    const meta = isPlainObject(rawValue?.meta) ? rawValue.meta : {};
    const candidates = [
        meta.value,
        meta.number,
        meta.numeric,
        meta.amount,
        meta.num,
        meta.int,
        meta.float,
    ];

    for (const candidate of candidates) {
        const num = normalizeNumber(candidate);
        if (num !== undefined) return num;
    }

    const text = normalizeStringFromOption(rawValue);
    if (!text) return undefined;

    return parseNumberFromString(text);
}

function normalizeBooleanFromOption(rawValue) {
    const meta = isPlainObject(rawValue?.meta) ? rawValue.meta : {};
    const candidates = [meta.value, meta.boolean, meta.bool, meta.flag];
    for (const candidate of candidates) {
        const bool = normalizeBoolean(candidate);
        if (bool !== undefined) return bool;
    }

    const text = normalizeStringFromOption(rawValue);
    return normalizeBoolean(text);
}

function normalizeStringFromOption(rawValue) {
    if (rawValue == null) return undefined;
    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        return trimmed.length ? trimmed : undefined;
    }

    if (typeof rawValue?.value_code === "string") {
        const trimmed = rawValue.value_code.trim();
        return trimmed.length ? trimmed : undefined;
    }

    if (typeof rawValue?.value_name === "string") {
        const trimmed = rawValue.value_name.trim();
        return trimmed.length ? trimmed : undefined;
    }

    const meta = isPlainObject(rawValue?.meta) ? rawValue.meta : {};
    if (typeof meta.value === "string") {
        const trimmed = meta.value.trim();
        return trimmed.length ? trimmed : undefined;
    }

    return undefined;
}

function addUniqueValue(result, spec, value) {
    if (value === undefined) return;
    const key = spec.key;
    if (!key) return;

    const payload = result.get(key) ?? { values: [], seen: new Set() };
    const dedupeKey = spec.type === "string"
        ? String(value).toLowerCase()
        : String(value);

    if (payload.seen.has(dedupeKey)) return;
    payload.seen.add(dedupeKey);
    payload.values.push(value);
    result.set(key, payload);
}

function normalizeCode(code) {
    const normalized = String(code ?? "").trim().toLowerCase();
    return normalized.length ? normalized : null;
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

function parseNumberFromString(text) {
    if (!text) return undefined;
    const match = String(text).match(/-?\d+(?:\.\d+)?/);
    if (!match) return undefined;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
