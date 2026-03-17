export const PAYMENT_MODULE_NAME = "payment";
export const PAYMENTS_BASE_PATH = "/payments";
export const PAYMENT_CALLBACK_BASE_PATH = "/payment";
export const PAYMENT_COLLECTIONS = {
    payments: "payments",
};
export const PAYMENT_METHODS = Object.freeze(["cod", "vnpay"]);
export const PAYMENT_PROVIDERS = Object.freeze(["internal", "vnpay"]);
export const PAYMENT_STATUSES = Object.freeze([
    "pending",
    "paid",
    "failed",
    "cancelled",
]);
export const PAYMENT_TERMINAL_STATUSES = Object.freeze([
    "paid",
    "failed",
    "cancelled",
]);
export const DEFAULT_PAYMENT_CURRENCY = "VND";
export const DEFAULT_VNPAY_VERSION = "2.1.0";
export const DEFAULT_VNPAY_LOCALE = "vn";
export const DEFAULT_VNPAY_ORDER_TYPE = "other";
export const DEFAULT_VNPAY_EXPIRE_MINUTES = 15;
