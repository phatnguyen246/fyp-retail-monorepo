export function createOrderingSuccessPayload({ data, meta } = {}) {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function sendOrderingSuccess(res, { status = 200, data, meta } = {}) {
    return res.status(status).json(
        createOrderingSuccessPayload({
            data,
            meta,
        })
    );
}
