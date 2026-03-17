export function createPaymentSuccessPayload({ data, meta } = {}) {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function sendPaymentSuccess(res, { status = 200, data, meta } = {}) {
    return res.status(status).json(
        createPaymentSuccessPayload({
            data,
            meta,
        })
    );
}
