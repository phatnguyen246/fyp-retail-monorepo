export function createAuthHttpError({
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

export function createAuthUnauthorizedError(message = "Authentication required", meta) {
    return createAuthHttpError({
        httpStatus: 401,
        code: "AUTH_UNAUTHORIZED",
        message,
        meta,
    });
}

export function createAuthForbiddenError(message = "Admin access required", meta) {
    return createAuthHttpError({
        httpStatus: 403,
        code: "AUTH_FORBIDDEN",
        message,
        meta,
    });
}

export function createAuthInvalidCredentialsError(
    message = "Invalid email or password",
    meta
) {
    return createAuthHttpError({
        httpStatus: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message,
        meta,
    });
}

export function createAuthConflictError(message, meta) {
    return createAuthHttpError({
        httpStatus: 409,
        code: "AUTH_CONFLICT",
        message,
        meta,
    });
}

