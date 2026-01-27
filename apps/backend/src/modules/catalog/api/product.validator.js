function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}

function pick(obj, keys) {
    const out = {};
    for (const k of keys) if (k in obj) out[k] = obj[k];
    return out;
}

/**
 * Validate thô (shape check) cho createProduct.
 * - Không làm business validation nặng (unique slug...) => để use case.
 * - Chỉ đảm bảo body là object, có field cơ bản, options/values là mảng (nếu có).
 */
export function validateCreateProductBody(body) {
    if (!isPlainObject(body)) {
        return { ok: false, error: { code: "INVALID_BODY", message: "Body must be an object" } };
    }

    // Allow-list fields để tránh client gửi bừa
    const allowed = pick(body, [
        "name",
        "slug",
        "product_type",
        "status",
        "main_specs",
        "images",
        "options",
    ]);

    if ("options" in allowed && allowed.options != null && !Array.isArray(allowed.options)) {
        return {
            ok: false,
            error: { code: "INVALID_OPTIONS", message: "options must be an array" },
        };
    }

    if (Array.isArray(allowed.options)) {
        for (const [i, opt] of allowed.options.entries()) {
            if (!isPlainObject(opt)) {
                return {
                    ok: false,
                    error: { code: "INVALID_OPTION", message: `options[${i}] must be an object` },
                };
            }
            if ("values" in opt && opt.values != null && !Array.isArray(opt.values)) {
                return {
                    ok: false,
                    error: {
                        code: "INVALID_OPTION_VALUES",
                        message: `options[${i}].values must be an array`,
                    },
                };
            }
            if (Array.isArray(opt.values)) {
                for (const [j, v] of opt.values.entries()) {
                    if (!isPlainObject(v)) {
                        return {
                            ok: false,
                            error: {
                                code: "INVALID_OPTION_VALUE",
                                message: `options[${i}].values[${j}] must be an object`,
                            },
                        };
                    }
                }
            }
        }
    }

    return { ok: true, value: allowed };
}

/**
 * Validate thô cho addVariant.
 * - selections phải là array
 * - Các number fields nếu có thì phải parse được
 * - Không check combo uniqueness, sku uniqueness... => use case / DB
 */
export function validateAddVariantBody(body) {
    if (!isPlainObject(body)) {
        return { ok: false, error: { code: "INVALID_BODY", message: "Body must be an object" } };
    }

    const allowed = pick(body, [
        "sku",
        "price_amount",
        "currency",
        "stock_on_hand",
        "is_default",
        "variant_name",
        "selections",
    ]);

    if ("selections" in allowed && allowed.selections != null && !Array.isArray(allowed.selections)) {
        return {
            ok: false,
            error: { code: "INVALID_SELECTIONS", message: "selections must be an array" },
        };
    }

    if (Array.isArray(allowed.selections)) {
        for (const [i, s] of allowed.selections.entries()) {
            if (!isPlainObject(s)) {
                return {
                    ok: false,
                    error: { code: "INVALID_SELECTION", message: `selections[${i}] must be an object` },
                };
            }
            // Những field này dùng để build signature + lưu selections id
            for (const k of ["option_code", "value_code"]) {
                if (!(k in s)) {
                    return {
                        ok: false,
                        error: { code: "MISSING_FIELD", message: `selections[${i}].${k} is required` },
                    };
                }
            }
        }
    }

    return { ok: true, value: allowed };
}
