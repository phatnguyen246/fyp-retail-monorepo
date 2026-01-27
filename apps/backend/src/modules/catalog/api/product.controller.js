import { validateCreateProductBody, validateAddVariantBody } from "./product.validator.js";
import { mapCreateProductRequest, mapAddVariantRequest } from "./product.mapper.js";

function sendError(res, err) {
    // Mặc định: Error thường
    const code = err?.code || err?.message || "INTERNAL_ERROR";
    const status = err?.statusCode || 500;

    // Mongo duplicate key
    // E11000 duplicate key error collection...
    if (typeof err?.message === "string" && err.message.includes("E11000")) {
        return res.status(409).json({ code: "DUPLICATE_KEY", message: "Duplicate key" });
    }

    // Một số error code từ usecase (string)
    const known = new Set([
        "PRODUCT_NOT_FOUND",
        "VARIANT_COMBINATION_EXISTS",
        "PRODUCT_NAME_REQUIRED",
        "PRODUCT_SLUG_REQUIRED",
        "PRODUCT_STATUS_INVALID",
    ]);

    if (known.has(code)) {
        const http = code === "PRODUCT_NOT_FOUND" ? 404 : 400;
        return res.status(http).json({ code, message: code });
    }

    return res.status(status).json({ code, message: err?.message || "Internal error" });
}

export function makeProductController({ usecases }) {
    return {
        async createProduct(req, res) {
            const checked = validateCreateProductBody(req.body);
            if (!checked.ok) return res.status(400).json(checked.error);

            try {
                const input = mapCreateProductRequest(checked.value);
                const created = await usecases.createProduct(input);
                return res.status(201).json(created);
            } catch (err) {
                return sendError(res, err);
            }
        },

        async addVariant(req, res) {
            const checked = validateAddVariantBody(req.body);
            if (!checked.ok) return res.status(400).json(checked.error);

            try {
                const input = mapAddVariantRequest({ params: req.params, body: checked.value });
                const updated = await usecases.addVariant(input);
                return res.status(200).json(updated);
            } catch (err) {
                return sendError(res, err);
            }
        },
    };
}
