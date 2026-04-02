import { sendAdminOverviewSuccess } from "./admin-overview.response.js";

export function createAdminOverviewController({ services } = {}) {
    return {
        async getOverview(_req, res) {
            const overview = await services.getAdminOverview();

            return sendAdminOverviewSuccess(res, {
                data: overview,
            });
        },
    };
}
