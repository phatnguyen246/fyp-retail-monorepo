// apps/backend/src/modules/catalog/application/results/product.result.js

export function productResult(product) {
    if (!product) return null;

    const p =
        typeof product.toPrimitives === "function"
            ? product.toPrimitives()
            : typeof product.toJSON === "function"
                ? product.toJSON()
                : typeof product.toObject === "function"
                    ? product.toObject()
                    : product;

    return {
        id: String(p.id ?? p._id ?? ""),
        name: p.name,
        slug: p.slug,
        product_type: p.product_type,
        status: p.status,
        main_specs: p.main_specs ?? {},
        images: Array.isArray(p.images) ? p.images : [],
        options: Array.isArray(p.options) ? p.options : [],
        variants: Array.isArray(p.variants) ? p.variants : [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
