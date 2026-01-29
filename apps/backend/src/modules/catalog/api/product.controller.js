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
import {
    mapListProductsResponse,
    mapProductResponse,
    mapUpdateStatusResponse,
} from "./product.response.js";

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
                return res.status(201).json(mapProductResponse(created));
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
                return res.status(200).json(mapProductResponse(updated));
            } catch (err) {
                next(err);
            }
        },

        // GET /catalog/products?status=&product_type=&q=&limit=&cursor=&sort_field=&sort_dir=
        async listProducts(req, res, next) {
            const checked = validateListProductsRequest({ query: req.query });
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const command = mapListProductsRequest(checked.value);
                const result = await usecases.listProducts(command);
                res.json(mapListProductsResponse(result));
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
                res.json(mapProductResponse(product));
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
                res.json(mapProductResponse(product));
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
                res.json(mapUpdateStatusResponse(result));
            } catch (err) {
                next(err);
            }
        },
    };
}
