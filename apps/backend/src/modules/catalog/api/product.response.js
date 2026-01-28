function normalizeProduct(result = {}) {
    return {
        id: result.id,
        name: result.name,
        slug: result.slug,
        product_type: result.product_type,
        status: result.status,
        main_specs: result.main_specs ?? {},
        images: Array.isArray(result.images) ? result.images : [],
        options: Array.isArray(result.options) ? result.options : [],
        variants: Array.isArray(result.variants) ? result.variants : [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
    };
}

export function mapProductResponse(result) {
    if (!result) return null;
    return normalizeProduct(result);
}

export function mapProductSummaryResponse(result) {
    if (!result) return null;
    const product = normalizeProduct(result);
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        product_type: product.product_type,
        status: product.status,
        main_specs: product.main_specs,
        images: product.images,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}

export function mapListProductsResponse(result = {}) {
    return {
        page: result.page,
        page_size: result.page_size,
        total: result.total,
        items: Array.isArray(result.items)
            ? result.items.map(mapProductSummaryResponse)
            : [],
    };
}

export function mapUpdateStatusResponse(result) {
    return {
        ok: true,
        data: mapProductResponse(result),
    };
}
