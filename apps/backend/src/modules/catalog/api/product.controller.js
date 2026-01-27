import { validateCreateProductBody, validateAddVariantBody } from "./product.validator.js";
import { mapCreateProductRequest, mapAddVariantRequest } from "./product.mapper.js";
import { AppError } from "../application/errors/index.js";

export function makeProductController({ usecases }) {
    return {
        async createProduct(req, res, next) {
            const checked = validateCreateProductBody(req.body);
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const input = mapCreateProductRequest(checked.value);
                const created = await usecases.createProduct(input);
                return res.status(201).json(created);
            } catch (err) {
                return handleError(err, res, next);
            }
        },

        async addVariant(req, res, next) {
            const checked = validateAddVariantBody(req.body);
            if (!checked.ok) {
                return res.status(400).json(checked.error);
            }

            try {
                const input = mapAddVariantRequest({
                    params: req.params,
                    body: checked.value,
                });

                const updated = await usecases.addVariant(input);
                return res.status(200).json(updated);
            } catch (err) {
                return handleError(err, res, next);
            }
        },
    };
}

/**
 * API layer chỉ map Application error → HTTP
 * Không đoán status
 * Không parse message
 * Không biết business
 */
function handleError(err, res, next) {
    if (err instanceof AppError) {
        return res.status(err.httpStatus).json({
            code: err.code,
            message: err.message,
        });
    }

    // Unexpected / system error → để global error middleware xử lý
    return next(err);
}
