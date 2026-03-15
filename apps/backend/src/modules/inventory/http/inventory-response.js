export function createInventorySuccessPayload({ data, meta } = {}) {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function sendInventorySuccess(res, { status = 200, data, meta } = {}) {
    return res.status(status).json(
        createInventorySuccessPayload({
            data,
            meta,
        })
    );
}
