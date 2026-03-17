export const ORDERING_MODULE_NAME = "ordering";
export const ORDERS_BASE_PATH = "/orders";
export const ORDERS_ADMIN_BASE_PATH = "/admin/orders";
export const ORDER_COLLECTIONS = {
    orders: "orders",
};
export const ORDER_PAYMENT_METHODS = Object.freeze(["cod", "vnpay"]);
export const ORDER_PAYMENT_STATUSES = Object.freeze([
    "pending",
    "paid",
    "failed",
    "cancelled",
]);
export const ORDER_STATUSES = Object.freeze([
    "pending",
    "confirmed",
    "completed",
    "cancelled",
]);
export const ORDER_STOCK_COMMIT_STATUSES = Object.freeze([
    "not_committed",
    "committed",
    "released",
]);
