import { createCatalogController } from "./catalog.controller.js";
import { sendCatalogSuccess } from "./catalog-response.js";

export function createCatalogAdminController({ services }) {
    const legacyController = createCatalogController({ services });

    return {
        ...legacyController,

        async listAdminProducts(req, res) {
            const result = await services.listAdminProducts({
                query: req.query,
            });

            return sendCatalogSuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },

        async createProduct(req, res) {
            const product = await services.createProduct({
                input: req.body,
                actorId: req.user?.id ?? null,
            });

            return sendCatalogSuccess(res, {
                status: 201,
                data: product,
            });
        },

        async getProductDetailAdmin(req, res) {
            const detail = await services.getProductDetailAdmin({
                productId: req.params.productId,
            });

            return sendCatalogSuccess(res, {
                data: detail,
            });
        },

        async updateProduct(req, res) {
            const product = await services.updateProduct({
                productId: req.params.productId,
                input: req.body,
                actorId: req.user?.id ?? null,
            });

            return sendCatalogSuccess(res, {
                data: product,
            });
        },

        async importProducts(req, res) {
            const result = await services.importProducts({
                file: req.file,
                actorId: req.user?.id ?? null,
            });

            return sendCatalogSuccess(res, {
                status: 201,
                data: result.data,
                meta: result.meta,
            });
        },

        async cloneProduct(req, res) {
            const product = await services.cloneProduct({
                productId: req.params.productId,
                input: req.body,
                actorId: req.user?.id ?? null,
            });

            return sendCatalogSuccess(res, {
                status: 201,
                data: product,
            });
        },

        async previewYoutubeVideo(req, res) {
            const preview = await services.previewYoutubeVideo({
                input: req.body,
            });

            return sendCatalogSuccess(res, {
                data: preview,
            });
        },
    };
}
