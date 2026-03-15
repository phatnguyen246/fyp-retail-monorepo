export function createInventoryHttpError({
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

export function createInventoryNotFoundError(message, meta) {
    return createInventoryHttpError({
        httpStatus: 404,
        code: "INVENTORY_NOT_FOUND",
        message,
        meta,
    });
}

export function createInventoryConflictError(message, meta) {
    return createInventoryHttpError({
        httpStatus: 409,
        code: "INVENTORY_CONFLICT",
        message,
        meta,
    });
}

export function createInventoryCatalogVariantNotFoundError(message, meta) {
    return createInventoryHttpError({
        httpStatus: 404,
        code: "INVENTORY_CATALOG_VARIANT_NOT_FOUND",
        message,
        meta,
    });
}

export function createInventoryCatalogSyncFailedError(message, meta) {
    return createInventoryHttpError({
        httpStatus: 500,
        code: "INVENTORY_CATALOG_SYNC_FAILED",
        message,
        meta,
    });
}

export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}
