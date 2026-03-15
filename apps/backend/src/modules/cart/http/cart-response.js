export function createCartSuccessPayload({ data, meta } = {}) {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function sendCartSuccess(res, { status = 200, data, meta } = {}) {
    return res.status(status).json(
        createCartSuccessPayload({
            data,
            meta,
        })
    );
}
