// apps/backend/src/modules/catalog/application/results/product.result.js

export function productResult(product) {
    if (!product) return null;

    // hỗ trợ Mongoose document
    const p = typeof product.toObject === "function" ? product.toObject() : product;

    return {
        id: String(p.id ?? p._id ?? ""),
        name: p.name,
        slug: p.slug,
        product_type: p.product_type,
        status: p.status,
        main_specs: p.main_specs ?? {},
        images: Array.isArray(p.images) ? p.images : [],
        options: Array.isArray(p.options) ? p.options : [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
