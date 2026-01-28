import {
    validateCreateProductRequest,
    validateAddVariantRequest,
    validateListProductsRequest,
    validateGetProductBySlugRequest,
    validateGetProductByIdRequest,
    validateUpdateProductStatusRequest,
} from "./product.validator.js";
import {
    mapCreateProductRequest,
    mapAddVariantRequest,
    mapListProductsRequest,
    mapGetProductBySlugRequest,
    mapGetProductByIdRequest,
    mapUpdateProductStatusRequest,
} from "./product.mapper.js";

export function makeProductController({ usecases }) {
    if (!usecases) throw new Error("MISSING_USECASES");

    return {
        async createProduct(req, res, next) {
            const checked = validateCreateProductRequest({ body: req.body });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapCreateProductRequest(checked.value);
                const created = await usecases.createProduct(command);
                return res.status(201).json(created);
            } catch (err) {
                next(err);
            }
        },

        async addVariant(req, res, next) {
            const checked = validateAddVariantRequest({ params: req.params, body: req.body });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapAddVariantRequest(checked.value);
                const updated = await usecases.addVariant(command);
                return res.status(200).json(updated);
            } catch (err) {
                next(err);
            }
        },

        // GET /catalog/products?status=&product_type=&q=&page=&page_size=&sort_field=&sort_dir=
        async listProducts(req, res, next) {
            const checked = validateListProductsRequest({ query: req.query });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapListProductsRequest(checked.value);
                const result = await usecases.listProducts(command);
                res.json(result);
            } catch (err) {
                next(err);
            }
        },

        // GET /catalog/products/:slug
        async getBySlug(req, res, next) {
            const checked = validateGetProductBySlugRequest({ params: req.params });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapGetProductBySlugRequest(checked.value);
                const product = await usecases.getProductBySlug(command);
                res.json(product);
            } catch (err) {
                next(err);
            }
        },

        // GET /catalog/admin/products/:id
        async getById(req, res, next) {
            const checked = validateGetProductByIdRequest({ params: req.params });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapGetProductByIdRequest(checked.value);
                const product = await usecases.getProductById(command);
                res.json(product);
            } catch (err) {
                next(err);
            }
        },

        async updateStatus(req, res, next) {
            const checked = validateUpdateProductStatusRequest({
                params: req.params,
                body: req.body,
            });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapUpdateProductStatusRequest(checked.value);
                const result = await usecases.updateProductStatus(command);
                res.json({ ok: true, data: result });
            } catch (err) {
                next(err);
            }
        },
    };
}
