/**
 * CreateProductDTO (Application DTO)
 * - Chuẩn hoá shape input cho use case createProduct
 * - Không làm business validation nặng (unique slug, policy...) => để use case
 * - Defensive: ép kiểu cơ bản, trim, default, chuẩn hoá nested options/values
 */
export function createProductDTO(input = {}) {
    const name = String(input.name ?? "").trim();
    const slug = String(input.slug ?? "").trim();

    const product_type = String(input.product_type ?? "smartphone").trim();
    const status = String(input.status ?? "draft").trim();

    const main_specs = input.main_specs ?? {};
    const images = Array.isArray(input.images) ? input.images.map(String) : [];

    const options = normalizeOptions(input.options);

    return {
        name,
        slug,
        product_type,
        status,
        main_specs,
        images,
        options,

        // IMPORTANT: rule tại thời điểm tạo product
        variants: [],
    };
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
