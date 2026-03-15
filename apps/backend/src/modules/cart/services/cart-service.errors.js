export function createCartHttpError({
    httpStatus,
    code,
    message,
    meta,
} = {}) {
    const error = new Error(message);

    error.httpStatus = httpStatus;
    error.code = code;

    if (meta !== undefined) {
        error.meta = meta;
    }

    return error;
}

export function createCartItemNotFoundError(message, meta) {
    return createCartHttpError({
        httpStatus: 404,
        code: "CART_ITEM_NOT_FOUND",
        message,
        meta,
    });
}

export function createCartVariantUnavailableError(message, meta) {
    return createCartHttpError({
        httpStatus: 409,
        code: "CART_VARIANT_UNAVAILABLE",
        message,
        meta,
    });
}

export function createCartQuantityConflictError(message, meta) {
    return createCartHttpError({
        httpStatus: 409,
        code: "CART_QUANTITY_EXCEEDS_STOCK",
        message,
        meta,
    });
}

export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}
