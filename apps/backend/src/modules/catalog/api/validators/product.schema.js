export const createProductSchema = {
    body: {
        type: "object",
        required: ["name", "slug"],
        properties: {
            name: { type: "string", trim: true, minLength: 1 },
            slug: { type: "string", trim: true, minLength: 1 },
            product_type: { type: "string", trim: true },
            status: { type: "string", trim: true },
            main_specs: { type: "object", passthrough: true },
            images: {
                type: "array",
                items: { type: "string", trim: true },
            },
            options: {
                type: "array",
                items: {
                    type: "object",
                    required: ["code", "name"],
                    properties: {
                        code: { type: "string", trim: true, minLength: 1 },
                        name: { type: "string", trim: true, minLength: 1 },
                        sort_order: { type: "number", coerce: true, integer: true },
                        values: {
                            type: "array",
                            items: {
                                type: "object",
                                required: ["value_code", "value_name"],
                                properties: {
                                    value_code: { type: "string", trim: true, minLength: 1 },
                                    value_name: { type: "string", trim: true, minLength: 1 },
                                    sort_order: { type: "number", coerce: true, integer: true },
                                    meta: { type: "object", passthrough: true },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

export const addVariantSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", trim: true, minLength: 1 },
        },
    },
    body: {
        type: "object",
        required: ["sku", "price_amount", "selections"],
        properties: {
            sku: { type: "string", trim: true, minLength: 1 },
            price_amount: { type: "number", coerce: true, min: 0 },
            currency: { type: "string", trim: true },
            stock_on_hand: { type: "number", coerce: true, min: 0 },
            is_default: { type: "boolean", coerce: true },
            variant_name: { type: "string", trim: true },
            selections: {
                type: "array",
                items: {
                    type: "object",
                    required: ["option_code", "value_code"],
                    properties: {
                        option_code: { type: "string", trim: true, minLength: 1 },
                        value_code: { type: "string", trim: true, minLength: 1 },
                    },
                },
            },
        },
    },
};

export const listProductsSchema = {
    query: {
        type: "object",
        properties: {
            status: { type: "string", trim: true, emptyToUndefined: true },
            product_type: { type: "string", trim: true, emptyToUndefined: true },
            q: { type: "string", trim: true, emptyToUndefined: true },
            limit: { type: "number", coerce: true, integer: true, min: 1 },
            cursor: { type: "string", trim: true, emptyToUndefined: true },
            sort_field: {
                type: "string",
                trim: true,
                emptyToUndefined: true,
                enum: ["createdAt", "updatedAt", "name", "status", "product_type"],
            },
            sort_dir: { type: "string", trim: true, emptyToUndefined: true, enum: ["asc", "desc"] },
        },
    },
};

export const getProductBySlugSchema = {
    params: {
        type: "object",
        required: ["slug"],
        properties: {
            slug: { type: "string", trim: true, minLength: 1 },
        },
    },
};

export const getProductByIdSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", trim: true, minLength: 1 },
        },
    },
};

export const updateProductStatusSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", trim: true, minLength: 1 },
        },
    },
    body: {
        type: "object",
        required: ["status"],
        properties: {
            status: { type: "string", trim: true, minLength: 1 },
        },
    },
};
