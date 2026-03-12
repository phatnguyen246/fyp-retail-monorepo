import { sendCatalogSuccess } from "./catalog-response.js";

export function createCatalogStorefrontController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async listProducts(req, res) {
            const result = await services.listProducts({
                query: req.query,
            });

            return sendCatalogSuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },

        async getProductDetail(req, res) {
            const result = await services.getProductDetailStorefront({
                params: req.params,
            });

            return sendCatalogSuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },

        async searchProducts(req, res) {
            const result = await services.searchProducts({
                query: req.query,
            });

            return sendCatalogSuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },

        async compareProducts(req, res) {
            const result = await services.compareProducts({
                input: req.body,
            });

            return sendCatalogSuccess(res, {
                data: result,
            });
        },
    };
}
