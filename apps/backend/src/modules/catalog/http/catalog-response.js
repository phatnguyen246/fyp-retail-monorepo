export function createCatalogSuccessPayload({ data, meta } = {}) {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function sendCatalogSuccess(res, { status = 200, data, meta } = {}) {
    return res.status(status).json(
        createCatalogSuccessPayload({
            data,
            meta,
        })
    );
}
