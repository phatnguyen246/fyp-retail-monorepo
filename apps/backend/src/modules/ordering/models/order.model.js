import {
    ORDER_PAYMENT_METHODS,
    ORDER_PAYMENT_STATUSES,
    ORDER_STATUSES,
} from "../constants/index.js";
import {
    createDocumentId,
    createTimestampPair,
    normalizeDate,
    normalizeNonNegativeNumber,
    normalizeOptionalString,
    normalizePositiveInteger,
    normalizeRequiredObjectId,
    normalizeRequiredString,
} from "./model-helpers.js";

function normalizeEnumValue(value, fieldName, allowedValues) {
    const normalizedValue = normalizeRequiredString(value, fieldName);

    if (!allowedValues.includes(normalizedValue)) {
        throw new Error(
            `Ordering requires ${fieldName} to be one of: ${allowedValues.join(", ")}`
        );
    }

    return normalizedValue;
}

function normalizeOptionalStatus(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeEnumValue(value, fieldName, ORDER_STATUSES);
}

export const ORDER_ITEM_DOCUMENT_SHAPE = Object.freeze({
    productId: { type: "ObjectId", required: true },
    variantId: { type: "ObjectId", required: true },
    sku: { type: "string", required: true },
    productName: { type: "string", required: true },
    variantLabel: { type: "string", required: false, default: null },
    thumbnailUrl: { type: "string", required: false, default: null },
    unitPrice: { type: "number", required: true },
    quantity: { type: "number", required: true },
    lineTotal: { type: "number", required: true },
});

export const ORDER_STATUS_LOG_DOCUMENT_SHAPE = Object.freeze({
    fromStatus: { type: "string", required: false, default: null },
    toStatus: { type: "string", required: true },
    changedBy: { type: "string", required: true },
    changedAt: { type: "date", required: true },
});

export const ORDER_DOCUMENT_SHAPE = Object.freeze({
    _id: { type: "ObjectId", required: false },
    orderCode: { type: "string", required: true },
    accountId: { type: "string", required: false, default: null },
    phoneNumber: { type: "string", required: true },
    shippingAddressLine: { type: "string", required: true },
    paymentMethod: { type: "string", required: true },
    paymentStatus: { type: "string", required: true },
    orderStatus: { type: "string", required: true },
    items: { type: "array", required: true },
    subtotal: { type: "number", required: true },
    discountTotal: { type: "number", required: true },
    shippingFee: { type: "number", required: true },
    grandTotal: { type: "number", required: true },
    statusLogs: { type: "array", required: true, default: [] },
    createdAt: { type: "date", required: true },
    updatedAt: { type: "date", required: true },
});

export function createOrderItem(input = {}) {
    return {
        productId: normalizeRequiredObjectId(input.productId, "productId"),
        variantId: normalizeRequiredObjectId(input.variantId, "variantId"),
        sku: normalizeRequiredString(input.sku, "sku"),
        productName: normalizeRequiredString(input.productName, "productName"),
        variantLabel: normalizeOptionalString(input.variantLabel, "variantLabel"),
        thumbnailUrl: normalizeOptionalString(input.thumbnailUrl, "thumbnailUrl"),
        unitPrice: normalizeNonNegativeNumber(input.unitPrice, "unitPrice"),
        quantity: normalizePositiveInteger(input.quantity, "quantity"),
        lineTotal: normalizeNonNegativeNumber(input.lineTotal, "lineTotal"),
    };
}

export function createOrderStatusLog(input = {}) {
    return {
        fromStatus: normalizeOptionalStatus(input.fromStatus, "fromStatus"),
        toStatus: normalizeEnumValue(input.toStatus, "toStatus", ORDER_STATUSES),
        changedBy: normalizeRequiredString(input.changedBy, "changedBy"),
        changedAt: normalizeDate(input.changedAt, "changedAt", new Date()),
    };
}

export function createOrder(input = {}) {
    const { createdAt, updatedAt } = createTimestampPair(input);

    return {
        _id: createDocumentId(input._id, "_id"),
        orderCode: normalizeRequiredString(input.orderCode, "orderCode"),
        accountId: normalizeOptionalString(input.accountId, "accountId"),
        phoneNumber: normalizeRequiredString(input.phoneNumber, "phoneNumber"),
        shippingAddressLine: normalizeRequiredString(
            input.shippingAddressLine,
            "shippingAddressLine"
        ),
        paymentMethod: normalizeEnumValue(
            input.paymentMethod,
            "paymentMethod",
            ORDER_PAYMENT_METHODS
        ),
        paymentStatus: normalizeEnumValue(
            input.paymentStatus,
            "paymentStatus",
            ORDER_PAYMENT_STATUSES
        ),
        orderStatus: normalizeEnumValue(input.orderStatus, "orderStatus", ORDER_STATUSES),
        items: Array.isArray(input.items)
            ? input.items.map((item) => createOrderItem(item))
            : [],
        subtotal: normalizeNonNegativeNumber(input.subtotal, "subtotal"),
        discountTotal: normalizeNonNegativeNumber(
            input.discountTotal,
            "discountTotal",
            0
        ),
        shippingFee: normalizeNonNegativeNumber(input.shippingFee, "shippingFee", 0),
        grandTotal: normalizeNonNegativeNumber(input.grandTotal, "grandTotal"),
        statusLogs: Array.isArray(input.statusLogs)
            ? input.statusLogs.map((log) => createOrderStatusLog(log))
            : [],
        createdAt,
        updatedAt,
    };
}
