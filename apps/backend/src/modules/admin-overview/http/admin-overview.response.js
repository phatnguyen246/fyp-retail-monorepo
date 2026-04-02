export function createAdminOverviewSuccessPayload({ data } = {}) {
    return {
        data,
    };
}

export function sendAdminOverviewSuccess(res, { status = 200, data } = {}) {
    return res
        .status(status)
        .json(createAdminOverviewSuccessPayload({ data }));
}
