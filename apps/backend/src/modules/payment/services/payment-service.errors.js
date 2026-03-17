export function createPaymentHttpError({
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

export function createPaymentNotFoundError(message, meta) {
    return createPaymentHttpError({
        httpStatus: 404,
        code: "PAYMENT_NOT_FOUND",
        message,
        meta,
    });
}

export function createPaymentConflictError(message, meta) {
    return createPaymentHttpError({
        httpStatus: 409,
        code: "PAYMENT_CONFLICT",
        message,
        meta,
    });
}

export function createPaymentForbiddenError(message, meta) {
    return createPaymentHttpError({
        httpStatus: 403,
        code: "PAYMENT_FORBIDDEN",
        message,
        meta,
    });
}

export function createPaymentConfigurationError(message, meta) {
    return createPaymentHttpError({
        httpStatus: 500,
        code: "PAYMENT_CONFIGURATION_ERROR",
        message,
        meta,
    });
}
