export function createAccountHttpError({
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

export function createAccountNotFoundError(message, meta) {
    return createAccountHttpError({
        httpStatus: 404,
        code: "ACCOUNT_NOT_FOUND",
        message,
        meta,
    });
}

export function createAccountConflictError(message, meta) {
    return createAccountHttpError({
        httpStatus: 409,
        code: "ACCOUNT_CONFLICT",
        message,
        meta,
    });
}

export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}

