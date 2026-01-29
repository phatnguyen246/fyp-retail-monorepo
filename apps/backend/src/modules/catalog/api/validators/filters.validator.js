// apps/backend/src/modules/catalog/api/filters.validator.js
import { CatalogErrors } from "../../application/errors/index.js";
import { getFilterDef } from "../../domain/specs/index.js";

export function parseFiltersQuery({ product_type, filters }) {
    const rawFilters = filters;

    if (isEmptyFilters(rawFilters)) {
        return { filters: [] };
    }

    const type = normalizeOptionalString(product_type);
    if (!type) throw CatalogErrors.PRODUCT_TYPE_REQUIRED();

    const filterDef = getFilterDef(type);
    if (!filterDef) throw CatalogErrors.PRODUCT_TYPE_INVALID();

    const filterMap = buildFilterMap(filterDef);
    const allowedKeys = Array.from(filterMap.keys());

    const items = normalizeRawFilters(rawFilters);
    const normalized = items.map((item) => normalizeFilterItem(item, filterMap, allowedKeys));

    return { filters: normalized };
}

function normalizeRawFilters(raw) {
    let value = raw;

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            value = JSON.parse(trimmed);
        } catch (err) {
            throw CatalogErrors.FILTERS_INVALID("Filters must be valid JSON", { reason: err?.message });
        }
    }

    if (Array.isArray(value)) return value;
    if (isPlainObject(value)) return expandObjectFilters(value);

    throw CatalogErrors.FILTERS_INVALID();
}

function expandObjectFilters(obj) {
    const items = [];
    for (const [key, value] of Object.entries(obj)) {
        if (isPlainObject(value)) {
            for (const [op, v] of Object.entries(value)) {
                items.push({ key, op, value: v });
            }
        } else {
            items.push({ key, value });
        }
    }
    return items;
}

function normalizeFilterItem(item, filterMap, allowedKeys) {
    const key = normalizeOptionalString(item?.key);
    if (!key) throw CatalogErrors.FILTER_KEY_INVALID(String(item?.key ?? ""), allowedKeys);

    const def = filterMap.get(key);
    if (!def) throw CatalogErrors.FILTER_KEY_INVALID(key, allowedKeys);

    const allowedOps = Array.isArray(def.operators) ? def.operators : [];
    const op = normalizeOptionalString(item?.op);
    const operator = op ? op.toLowerCase() : inferDefaultOperator(def, item?.value);

    if (!allowedOps.includes(operator)) {
        throw CatalogErrors.FILTER_OPERATOR_INVALID(operator, allowedOps);
    }

    const value = normalizeFilterValue(def, operator, item?.value);
    if (value === undefined) {
        throw CatalogErrors.FILTER_VALUE_INVALID(key, operator);
    }

    return {
        key,
        type: def.type,
        op: operator,
        value,
    };
}

function inferDefaultOperator(def, rawValue) {
    if (def.type === "string") {
        return Array.isArray(rawValue) ? "in" : "eq";
    }
    if (def.type === "number") {
        if (Array.isArray(rawValue) && rawValue.length === 2) return "between";
        return "eq";
    }
    return "eq";
}

function normalizeFilterValue(def, operator, rawValue) {
    if (def.type === "number") {
        return normalizeNumberValue(operator, rawValue);
    }
    if (def.type === "boolean") {
        const bool = parseBoolean(rawValue);
        return bool === undefined ? undefined : bool;
    }
    if (def.type === "string") {
        if (operator === "in") {
            const list = normalizeStringList(rawValue);
            return list.length ? list : undefined;
        }
        const str = normalizeString(rawValue);
        return str ?? undefined;
    }
    return undefined;
}

function normalizeNumberValue(operator, rawValue) {
    if (operator === "between") {
        const range = normalizeRange(rawValue);
        return range ?? undefined;
    }

    const num = parseNumber(rawValue);
    return Number.isFinite(num) ? num : undefined;
}

function normalizeRange(rawValue) {
    if (Array.isArray(rawValue) && rawValue.length >= 2) {
        const min = parseNumber(rawValue[0]);
        const max = parseNumber(rawValue[1]);
        if (Number.isFinite(min) && Number.isFinite(max)) {
            return { min, max };
        }
        return undefined;
    }

    if (isPlainObject(rawValue)) {
        const min = parseNumber(rawValue.min ?? rawValue.from ?? rawValue.gte);
        const max = parseNumber(rawValue.max ?? rawValue.to ?? rawValue.lte);
        if (Number.isFinite(min) && Number.isFinite(max)) {
            return { min, max };
        }
    }

    if (typeof rawValue === "string") {
        const parts = rawValue.split(",").map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
            const min = parseNumber(parts[0]);
            const max = parseNumber(parts[1]);
            if (Number.isFinite(min) && Number.isFinite(max)) {
                return { min, max };
            }
        }
    }

    return undefined;
}

function normalizeStringList(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue
            .map((v) => normalizeString(v))
            .filter(Boolean);
    }
    if (typeof rawValue === "string") {
        return rawValue
            .split(",")
            .map((part) => normalizeString(part))
            .filter(Boolean);
    }
    const single = normalizeString(rawValue);
    return single ? [single] : [];
}

function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function parseBoolean(value) {
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
    const normalized = String(value).trim().toLowerCase();
    return normalized.length ? normalized : undefined;
}

function buildFilterMap(filterDef) {
    const map = new Map();
    const groups = Array.isArray(filterDef?.groups) ? filterDef.groups : [];
    for (const group of groups) {
        const filters = Array.isArray(group?.filters) ? group.filters : [];
        for (const filter of filters) {
            if (filter?.key) {
                map.set(filter.key, filter);
            }
        }
    }
    return map;
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}

function normalizeOptionalString(x) {
    const s = String(x ?? "").trim();
    return s ? s : undefined;
}

function isEmptyFilters(raw) {
    if (raw == null) return true;
    if (typeof raw === "string") return raw.trim().length === 0;
    if (Array.isArray(raw)) return raw.length === 0;
    if (isPlainObject(raw)) return Object.keys(raw).length === 0;
    return false;
}
