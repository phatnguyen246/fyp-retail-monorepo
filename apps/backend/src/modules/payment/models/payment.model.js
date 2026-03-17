import {
    PAYMENT_METHODS,
    PAYMENT_PROVIDERS,
    PAYMENT_STATUSES,
} from "../constants/index.js";
import {
    createDocumentId,
    createTimestampPair,
    normalizeDate,
    normalizeNonNegativeNumber,
    normalizeOptionalObject,
    normalizeOptionalString,
    normalizeRequiredObjectId,
    normalizeRequiredString,
} from "./model-helpers.js";

function normalizeEnumValue(value, fieldName, allowedValues) {
    const normalizedValue = normalizeRequiredString(value, fieldName);

    if (!allowedValues.includes(normalizedValue)) {
        throw new Error(
            `Payment requires ${fieldName} to be one of: ${allowedValues.join(", ")}`
        );
    }

    return normalizedValue;
}

function normalizeOptionalDate(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeDate(value, fieldName);
}

export const PAYMENT_DOCUMENT_SHAPE = Object.freeze({
    _id: { type: "ObjectId", required: false },
    paymentCode: { type: "string", required: true },
    orderId: { type: "ObjectId", required: true },
    orderCode: { type: "string", required: true },
    paymentMethod: { type: "string", required: true },
    provider: { type: "string", required: true },
    amount: { type: "number", required: true },
    currency: { type: "string", required: true },
    status: { type: "string", required: true },
    providerTxnRef: { type: "string", required: false, default: null },
    providerTransactionNo: { type: "string", required: false, default: null },
    providerResponseCode: { type: "string", required: false, default: null },
    providerTransactionStatus: { type: "string", required: false, default: null },
    providerBankCode: { type: "string", required: false, default: null },
    providerBankTranNo: { type: "string", required: false, default: null },
    providerCardType: { type: "string", required: false, default: null },
    orderInfo: { type: "string", required: false, default: null },
    payDate: { type: "string", required: false, default: null },
    lastPayload: { type: "object", required: false, default: null },
    paidAt: { type: "date", required: false, default: null },
    failedAt: { type: "date", required: false, default: null },
    createdAt: { type: "date", required: true },
    updatedAt: { type: "date", required: true },
});

export function createPayment(input = {}) {
    const { createdAt, updatedAt } = createTimestampPair(input);

    return {
        _id: createDocumentId(input._id, "_id"),
        paymentCode: normalizeRequiredString(input.paymentCode, "paymentCode"),
        orderId: normalizeRequiredObjectId(input.orderId, "orderId"),
        orderCode: normalizeRequiredString(input.orderCode, "orderCode"),
        paymentMethod: normalizeEnumValue(
            input.paymentMethod,
            "paymentMethod",
            PAYMENT_METHODS
        ),
        provider: normalizeEnumValue(input.provider, "provider", PAYMENT_PROVIDERS),
        amount: normalizeNonNegativeNumber(input.amount, "amount"),
        currency: normalizeRequiredString(input.currency, "currency"),
        status: normalizeEnumValue(input.status, "status", PAYMENT_STATUSES),
        providerTxnRef: normalizeOptionalString(input.providerTxnRef, "providerTxnRef"),
        providerTransactionNo: normalizeOptionalString(
            input.providerTransactionNo,
            "providerTransactionNo"
        ),
        providerResponseCode: normalizeOptionalString(
            input.providerResponseCode,
            "providerResponseCode"
        ),
        providerTransactionStatus: normalizeOptionalString(
            input.providerTransactionStatus,
            "providerTransactionStatus"
        ),
        providerBankCode: normalizeOptionalString(
            input.providerBankCode,
            "providerBankCode"
        ),
        providerBankTranNo: normalizeOptionalString(
            input.providerBankTranNo,
            "providerBankTranNo"
        ),
        providerCardType: normalizeOptionalString(
            input.providerCardType,
            "providerCardType"
        ),
        orderInfo: normalizeOptionalString(input.orderInfo, "orderInfo"),
        payDate: normalizeOptionalString(input.payDate, "payDate"),
        lastPayload: normalizeOptionalObject(input.lastPayload, "lastPayload"),
        paidAt: normalizeOptionalDate(input.paidAt, "paidAt"),
        failedAt: normalizeOptionalDate(input.failedAt, "failedAt"),
        createdAt,
        updatedAt,
    };
}
