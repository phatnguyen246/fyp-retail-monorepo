import removeAccents from "remove-accents";
import {
    DEFAULT_VNPAY_EXPIRE_MINUTES,
    DEFAULT_VNPAY_LOCALE,
    DEFAULT_VNPAY_ORDER_TYPE,
    DEFAULT_VNPAY_VERSION,
    PAYMENT_MODULE_NAME,
    PAYMENT_TERMINAL_STATUSES,
} from "../constants/index.js";

export function createPaymentHealthPayload() {
    return {
        ok: true,
        module: PAYMENT_MODULE_NAME,
    };
}

export function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

export function createPaymentRequester(request = {}) {
    return {
        isAuthenticated: request?.isAuthenticated === true,
        role: request?.role ?? "guest",
        accountId:
            typeof request?.accountId === "string" && request.accountId.length > 0
                ? request.accountId
                : null,
    };
}

export function isPaymentTerminalStatus(status) {
    return PAYMENT_TERMINAL_STATUSES.includes(status);
}

export function sanitizeVnpayOrderInfo(value) {
    const baseValue =
        typeof value === "string" && value.trim().length > 0
            ? value
            : "Thanh toan don hang";

    const normalized = removeAccents(baseValue)
        .replace(/[^A-Za-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return normalized.length > 0 ? normalized : "Thanh toan don hang";
}

export function buildVnpayOrderInfo(order) {
    return sanitizeVnpayOrderInfo(`Thanh toan don hang ${order?.orderCode ?? ""}`);
}

export function isSuccessfulVnpayPayload(payload = {}) {
    return (
        payload?.vnp_ResponseCode === "00" &&
        payload?.vnp_TransactionStatus === "00"
    );
}

export function mapVnpayFailureStatus(payload = {}) {
    return payload?.vnp_ResponseCode === "24" ? "cancelled" : "failed";
}

export function resolveVnpayConfig({ env = process.env } = {}) {
    const config = {
        version: env.VNP_VERSION ?? DEFAULT_VNPAY_VERSION,
        tmnCode: env.VNP_TMNCODE ?? null,
        hashSecret: env.VNP_HASH_SECRET ?? null,
        paymentUrl: env.VNP_PAYMENT_URL ?? null,
        returnUrl: env.VNP_RETURN_URL ?? null,
        ipnUrl: env.VNP_IPN_URL ?? null,
        locale: env.VNP_LOCALE ?? DEFAULT_VNPAY_LOCALE,
        currency: env.VNP_CURRENCY ?? null,
        orderType: DEFAULT_VNPAY_ORDER_TYPE,
        expireMinutes: DEFAULT_VNPAY_EXPIRE_MINUTES,
    };

    const missingKeys = [];

    if (!config.tmnCode) {
        missingKeys.push("VNP_TMNCODE");
    }

    if (!config.hashSecret) {
        missingKeys.push("VNP_HASH_SECRET");
    }

    if (!config.paymentUrl) {
        missingKeys.push("VNP_PAYMENT_URL");
    }

    if (!config.returnUrl) {
        missingKeys.push("VNP_RETURN_URL");
    }

    return {
        ...config,
        isConfigured: missingKeys.length === 0,
        missingKeys,
    };
}
