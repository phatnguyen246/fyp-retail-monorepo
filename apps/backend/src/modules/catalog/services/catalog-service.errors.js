export function createCatalogHttpError({
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

export function createCatalogNotFoundError(message, meta) {
    return createCatalogHttpError({
        httpStatus: 404,
        code: "CATALOG_NOT_FOUND",
        message,
        meta,
    });
}

export function createCatalogConflictError(message, meta) {
    return createCatalogHttpError({
        httpStatus: 409,
        code: "CATALOG_CONFLICT",
        message,
        meta,
    });
}

export function createCatalogUnprocessableEntityError(message, meta) {
    return createCatalogHttpError({
        httpStatus: 422,
        code: "CATALOG_UNPROCESSABLE_ENTITY",
        message,
        meta,
    });
}

export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}
