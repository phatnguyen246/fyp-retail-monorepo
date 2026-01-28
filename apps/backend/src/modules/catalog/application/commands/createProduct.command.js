// apps/backend/src/modules/catalog/application/commands/createProduct.command.js

export function createProductCommand(input = {}) {
    const name = String(input.name ?? "").trim();
    const slug = String(input.slug ?? "").trim();

    const product_type = String(input.product_type ?? "smartphone").trim();
    const status = String(input.status ?? "draft").trim();

    const main_specs = isPlainObject(input.main_specs) ? input.main_specs : {};
    const images = normalizeImages(input.images);

    const options = normalizeOptions(input.options);

    return {
        name,
        slug,
        product_type,
        status,
        main_specs,
        images,
        options,

        // Nếu policy của bạn là "tạo product không tạo variant"
        // thì KHÔNG cần variants ở đây.
        variants: [],
    };
}

function normalizeImages(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
}

function normalizeOptions(raw) {
    if (!Array.isArray(raw)) return [];

    return raw.map((opt) => {
        const code = String(opt?.code ?? "").trim();
        const name = String(opt?.name ?? "").trim();
        const sort_order = toInt(opt?.sort_order, 0);
        const values = normalizeOptionValues(opt?.values);

        return { code, name, sort_order, values };
    });
}

function normalizeOptionValues(raw) {
    if (!Array.isArray(raw)) return [];

    return raw.map((v) => {
        const value_code = String(v?.value_code ?? "").trim();
        const value_name = String(v?.value_name ?? "").trim();
        const sort_order = toInt(v?.sort_order, 0);
        const meta = isPlainObject(v?.meta) ? v.meta : {};

        return { value_code, value_name, sort_order, meta };
    });
}

function toInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
