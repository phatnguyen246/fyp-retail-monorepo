export function createProductRequestDTO({ body }) {
    return { body };
}

export function addVariantRequestDTO({ params, body }) {
    return { params, body };
}

export function listProductsRequestDTO({ query }) {
    return { query };
}

export function getProductBySlugRequestDTO({ params }) {
    return { params };
}

export function getProductByIdRequestDTO({ params }) {
    return { params };
}

export function updateProductStatusRequestDTO({ params, body }) {
    return { params, body };
}
