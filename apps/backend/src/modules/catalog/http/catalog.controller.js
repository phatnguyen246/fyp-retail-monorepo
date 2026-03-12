export function createCatalogController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async createProduct(req, res) {
            const product = await services.createProduct({
                input: req.body,
                actorId: req.user?.id ?? null,
            });

            return res.status(201).json(product);
        },

        async getProductDetailAdmin(req, res) {
            const detail = await services.getProductDetailAdmin({
                productId: req.params.productId,
            });

            return res.status(200).json(detail);
        },

        async updateProduct(req, res) {
            const product = await services.updateProduct({
                productId: req.params.productId,
                input: req.body,
                actorId: req.user?.id ?? null,
            });

            return res.status(200).json(product);
        },

        async softDeleteProduct(req, res) {
            const detail = await services.softDeleteProduct({
                productId: req.params.productId,
                actorId: req.user?.id ?? null,
            });

            return res.status(200).json(detail);
        },

        async createVariant(req, res) {
            const variant = await services.createVariant({
                productId: req.params.productId,
                input: req.body,
            });

            return res.status(201).json(variant);
        },

        async updateVariant(req, res) {
            const variant = await services.updateVariant({
                variantId: req.params.variantId,
                input: req.body,
            });

            return res.status(200).json(variant);
        },

        async softDeleteVariant(req, res) {
            const variant = await services.softDeleteVariant({
                variantId: req.params.variantId,
            });

            return res.status(200).json(variant);
        },
    };
}
