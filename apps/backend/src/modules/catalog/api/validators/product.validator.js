import {
    createProductSchema,
    addVariantSchema,
    listProductsSchema,
    getProductBySlugSchema,
    getProductByIdSchema,
    updateProductStatusSchema,
} from "./product.schema.js";
import {
    createProductRequestDTO,
    addVariantRequestDTO,
    listProductsRequestDTO,
    getProductBySlugRequestDTO,
    getProductByIdRequestDTO,
    updateProductStatusRequestDTO,
} from "../product.request.js";

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}

function fail(code, message, path) {
    const error = { code, message };
    if (path) error.path = path;
    return { ok: false, error };
}

function parseValue(schema, value, path, required) {
    if (value === undefined) {
        return required ? fail("MISSING_FIELD", `${path} is required`, path) : { ok: true };
    }
    if (value === null) {
        return fail("INVALID_FIELD", `${path} must not be null`, path);
    }

    switch (schema.type) {
        case "string": {
            let v = value;
            if (typeof v !== "string") {
                if (!schema.coerce) {
                    return fail("INVALID_FIELD", `${path} must be a string`, path);
                }
                v = String(v);
            }
            if (schema.trim) v = v.trim();
            if (!schema.allowEmpty && v.length === 0) {
                if (!required || schema.emptyToUndefined) return { ok: true };
                return fail("MISSING_FIELD", `${path} is required`, path);
            }
            if (schema.minLength != null && v.length < schema.minLength) {
                return fail(
                    "INVALID_FIELD",
                    `${path} must be at least ${schema.minLength} characters`,
                    path
                );
            }
            if (schema.enum && !schema.enum.includes(v)) {
                return fail("INVALID_FIELD", `${path} must be one of ${schema.enum.join(", ")}`, path);
            }
            return { ok: true, value: v };
        }
        case "number": {
            if (typeof value === "string" && value.trim().length === 0) {
                return required ? fail("MISSING_FIELD", `${path} is required`, path) : { ok: true };
            }
            const n = schema.coerce ? Number(value) : value;
            if (!Number.isFinite(n)) {
                return fail("INVALID_FIELD", `${path} must be a number`, path);
            }
            if (schema.integer && !Number.isInteger(n)) {
                return fail("INVALID_FIELD", `${path} must be an integer`, path);
            }
            if (schema.min != null && n < schema.min) {
                return fail("INVALID_FIELD", `${path} must be >= ${schema.min}`, path);
            }
            return { ok: true, value: n };
        }
        case "boolean": {
            if (typeof value === "boolean") return { ok: true, value };
            if (schema.coerce) {
                if (typeof value === "string") {
                    const v = value.trim().toLowerCase();
                    if (v === "true" || v === "1") return { ok: true, value: true };
                    if (v === "false" || v === "0") return { ok: true, value: false };
                }
                if (typeof value === "number") {
                    if (value === 1) return { ok: true, value: true };
                    if (value === 0) return { ok: true, value: false };
                }
            }
            return fail("INVALID_FIELD", `${path} must be a boolean`, path);
        }
        case "array": {
            if (!Array.isArray(value)) {
                return fail("INVALID_FIELD", `${path} must be an array`, path);
            }
            const items = [];
            for (let i = 0; i < value.length; i += 1) {
                const res = parseValue(schema.items, value[i], `${path}[${i}]`, true);
                if (!res.ok) return res;
                if (res.value !== undefined) items.push(res.value);
            }
            return { ok: true, value: items };
        }
        case "object": {
            if (!isPlainObject(value)) {
                return fail("INVALID_FIELD", `${path} must be an object`, path);
            }
            if (schema.passthrough) return { ok: true, value };

            const out = {};
            const requiredSet = new Set(schema.required || []);
            const properties = schema.properties || {};
            for (const key of Object.keys(properties)) {
                const hasKey = Object.prototype.hasOwnProperty.call(value, key);
                if (!hasKey) {
                    if (requiredSet.has(key)) {
                        return fail("MISSING_FIELD", `${path}.${key} is required`, `${path}.${key}`);
                    }
                    continue;
                }
                const res = parseValue(
                    properties[key],
                    value[key],
                    `${path}.${key}`,
                    requiredSet.has(key)
                );
                if (!res.ok) return res;
                if (res.value !== undefined) out[key] = res.value;
            }
            return { ok: true, value: out };
        }
        default:
            return fail("INVALID_SCHEMA", `${path} has unknown schema type`, path);
    }
}

function validateSection(sectionName, schema, value) {
    if (!isPlainObject(value)) {
        return fail(
            `INVALID_${sectionName.toUpperCase()}`,
            `${sectionName} must be an object`,
            sectionName
        );
    }
    return parseValue(schema, value, sectionName, true);
}

export function validateCreateProductRequest({ body } = {}) {
    const checkedBody = validateSection("body", createProductSchema.body, body);
    if (!checkedBody.ok) return checkedBody;

    return { ok: true, value: createProductRequestDTO({ body: checkedBody.value }) };
}

export function validateAddVariantRequest({ params, body } = {}) {
    const checkedParams = validateSection("params", addVariantSchema.params, params);
    if (!checkedParams.ok) return checkedParams;

    const checkedBody = validateSection("body", addVariantSchema.body, body);
    if (!checkedBody.ok) return checkedBody;

    return {
        ok: true,
        value: addVariantRequestDTO({ params: checkedParams.value, body: checkedBody.value }),
    };
}

export function validateListProductsRequest({ query } = {}) {
    const checkedQuery = validateSection("query", listProductsSchema.query, query ?? {});
    if (!checkedQuery.ok) return checkedQuery;

    return { ok: true, value: listProductsRequestDTO({ query: checkedQuery.value }) };
}

export function validateGetProductBySlugRequest({ params } = {}) {
    const checkedParams = validateSection("params", getProductBySlugSchema.params, params);
    if (!checkedParams.ok) return checkedParams;

    return { ok: true, value: getProductBySlugRequestDTO({ params: checkedParams.value }) };
}

export function validateGetProductByIdRequest({ params } = {}) {
    const checkedParams = validateSection("params", getProductByIdSchema.params, params);
    if (!checkedParams.ok) return checkedParams;

    return { ok: true, value: getProductByIdRequestDTO({ params: checkedParams.value }) };
}

export function validateUpdateProductStatusRequest({ params, body } = {}) {
    const checkedParams = validateSection("params", updateProductStatusSchema.params, params);
    if (!checkedParams.ok) return checkedParams;

    const checkedBody = validateSection("body", updateProductStatusSchema.body, body);
    if (!checkedBody.ok) return checkedBody;

    return {
        ok: true,
        value: updateProductStatusRequestDTO({ params: checkedParams.value, body: checkedBody.value }),
    };
}
