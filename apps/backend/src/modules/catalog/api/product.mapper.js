/**
 * Mapper: API Request DTO -> Application Command
 * - No validation here
 * - Only transform / rename / normalize
 */

export function mapCreateProductRequest(dto) {
    const body = dto.body ?? {};
    return {
        name: body.name,
        slug: body.slug,
        product_type: body.product_type,
        status: body.status,
        main_specs: body.main_specs,
        images: body.images,
        options: body.options,
    };
}

export function mapAddVariantRequest(dto) {
    const body = dto.body ?? {};
    return {
        productId: dto.params?.id,
        sku: body.sku,
        price_amount: body.price_amount,
        currency: body.currency,
        stock_on_hand: body.stock_on_hand,
        is_default: body.is_default,
        variant_name: body.variant_name,
        selections: body.selections,
    };
}

export function mapListProductsRequest(dto) {
    return dto.query ?? {};
}

export function mapGetProductBySlugRequest(dto) {
    return { slug: dto.params?.slug };
}

export function mapGetProductByIdRequest(dto) {
    return { productId: dto.params?.id };
}

export function mapUpdateProductStatusRequest(dto) {
    return {
        productId: dto.params?.id,
        status: dto.body?.status,
    };
}
