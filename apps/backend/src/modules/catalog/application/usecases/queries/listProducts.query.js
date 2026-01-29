// apps/backend/src/modules/catalog/application/usecases/listProducts.query.js
import { CatalogErrors } from "../../errors/index.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_SORT_FIELD = "createdAt";
const DEFAULT_SORT_DIR = "desc";
const ALLOWED_SORT_FIELDS = new Set([
    "createdAt",
    "updatedAt",
    "name",
    "status",
    "product_type",
]);

export function listProductsQuery(input = {}) {
    const limit = clamp(toInt(input.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const cursor = normalizeCursor(input.cursor);

    const rawProductType = normalizeOptionalString(input.product_type);
    const filter = {
        status: normalizeOptionalString(input.status),
        product_type: rawProductType ? rawProductType.toLowerCase() : undefined,
        q: normalizeOptionalString(input.q),
    };

    const field = normalizeOptionalString(input.sort_field) || DEFAULT_SORT_FIELD;
    if (!ALLOWED_SORT_FIELDS.has(field)) {
        throw CatalogErrors.SORT_FIELD_INVALID?.(field, Array.from(ALLOWED_SORT_FIELDS))
            ?? CatalogErrors.BAD_REQUEST?.("Sort field is invalid", { field });
    }

    const direction = normalizeSortDirection(input.sort_dir) || DEFAULT_SORT_DIR;
    if (!direction) {
        throw CatalogErrors.SORT_DIRECTION_INVALID?.(input.sort_dir, ["asc", "desc"])
            ?? CatalogErrors.BAD_REQUEST?.("Sort direction is invalid");
    }

    return {
        limit,
        cursor,
        filter,
        sort: { field, direction },
        filters: Array.isArray(input.filters) ? input.filters : [],
    };
}

function toInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function normalizeOptionalString(x) {
    const s = String(x ?? "").trim();
    return s ? s : undefined;
}

function normalizeCursor(x) {
    const s = String(x ?? "").trim();
    return s ? s : null;
}

function normalizeSortDirection(x) {
    const s = normalizeOptionalString(x);
    if (!s) return undefined;
    const v = s.toLowerCase();
    return v === "asc" || v === "desc" ? v : undefined;
}
