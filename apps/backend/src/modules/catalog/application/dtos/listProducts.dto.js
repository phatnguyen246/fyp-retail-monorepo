export function listProductsDTO(input = {}) {
    const page = toInt(input.page, 1);
    const page_size = clamp(toInt(input.page_size, 20), 1, 100);

    const filter = {
        status: normalizeOptionalString(input.status),
        product_type: normalizeOptionalString(input.product_type),
        q: normalizeOptionalString(input.q),
    };

    const sort = {
        field: normalizeOptionalString(input.sort_field) || "createdAt",
        direction: (normalizeOptionalString(input.sort_dir) || "desc").toLowerCase(),
    };

    return { page, page_size, filter, sort };
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
