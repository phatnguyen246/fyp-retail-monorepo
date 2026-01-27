/**
 * Mapper: HTTP -> Usecase input
 * (Application DTO sẽ normalize tiếp, mapper chỉ map & trim cơ bản)
 */

export function mapCreateProductRequest(body) {
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

export function mapAddVariantRequest({ params, body }) {
    return {
        productId: params.id,
        sku: body.sku,
        price_amount: body.price_amount,
        currency: body.currency,
        stock_on_hand: body.stock_on_hand,
        is_default: body.is_default,
        variant_name: body.variant_name,
        selections: body.selections,
    };
}
