export function createOrderingHttpError({
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

export function createOrderNotFoundError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 404,
        code: "ORDER_NOT_FOUND",
        message,
        meta,
    });
}

export function createOrderConflictError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 409,
        code: "ORDER_CONFLICT",
        message,
        meta,
    });
}

export function createOrderCheckoutError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 409,
        code: "ORDER_CHECKOUT_INVALID",
        message,
        meta,
    });
}

export function createOrderForbiddenError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 403,
        code: "ORDER_FORBIDDEN",
        message,
        meta,
    });
}

export function createOrderStatusTransitionError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 409,
        code: "ORDER_STATUS_TRANSITION_INVALID",
        message,
        meta,
    });
}

export function createOrderCancellationNotAllowedError(message, meta) {
    return createOrderingHttpError({
        httpStatus: 409,
        code: "ORDER_CANCELLATION_NOT_ALLOWED",
        message,
        meta,
    });
}

export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}
