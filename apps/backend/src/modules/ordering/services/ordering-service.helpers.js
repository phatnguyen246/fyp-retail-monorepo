import { ORDER_STATUSES } from "../constants/index.js";
import { createOrder, createOrderItem, createOrderStatusLog } from "../models/index.js";
import {
    composeVariantLabel,
    createOrderActor,
    generateOrderCode,
    toIdString,
} from "../utils/index.js";
import {
    createOrderCancellationNotAllowedError,
    createOrderCheckoutError,
    createOrderConflictError,
    createOrderForbiddenError,
    createOrderNotFoundError,
    createOrderStatusTransitionError,
} from "./ordering-service.errors.js";

function createCatalogReadMap(catalogReads = []) {
    return new Map(
        catalogReads
            .map((catalogRead) => [catalogRead?.variantId, catalogRead])
            .filter(([variantId]) => typeof variantId === "string")
    );
}

function createInventoryReadMap(inventoryReads = []) {
    return new Map(
        inventoryReads
            .map((inventoryRead) => [inventoryRead?.variantId, inventoryRead])
            .filter(([variantId]) => typeof variantId === "string")
    );
}

export function createOrderRequester(request = {}) {
    return {
        isAuthenticated: request?.isAuthenticated === true,
        role: request?.role ?? "guest",
        accountId:
            typeof request?.accountId === "string" && request.accountId.length > 0
                ? request.accountId
                : null,
    };
}

export function assertOrderCreateAllowed(requester = {}) {
    if (requester?.role === "admin") {
        throw createOrderForbiddenError("Admin accounts cannot create orders");
    }
}

export function assertCustomerRequester(requester = {}) {
    if (requester?.role !== "customer" || !requester?.accountId) {
        throw createOrderForbiddenError("Customer access required");
    }
}

export function resolveOrderItemAvailability({
    catalogRead,
    inventoryRead,
    quantity,
} = {}) {
    if (!catalogRead?.variantExists) {
        return {
            isAvailable: false,
            availabilityStatus: "variant_missing",
        };
    }

    if (catalogRead.variantIsDeleted === true) {
        return {
            isAvailable: false,
            availabilityStatus: "variant_deleted",
        };
    }

    if (!catalogRead?.productExists) {
        return {
            isAvailable: false,
            availabilityStatus: "product_missing",
        };
    }

    if (catalogRead.productIsDeleted === true) {
        return {
            isAvailable: false,
            availabilityStatus: "product_deleted",
        };
    }

    if (catalogRead.variantStatus !== "active") {
        return {
            isAvailable: false,
            availabilityStatus: "variant_inactive",
        };
    }

    if (catalogRead.productStatus !== "active") {
        return {
            isAvailable: false,
            availabilityStatus: "product_inactive",
        };
    }

    if (
        typeof catalogRead?.sku !== "string" ||
        catalogRead.sku.trim().length === 0 ||
        typeof catalogRead?.salePrice !== "number"
    ) {
        return {
            isAvailable: false,
            availabilityStatus: "variant_snapshot_invalid",
        };
    }

    if (inventoryRead?.isInStock !== true || inventoryRead?.stockQuantity < 1) {
        return {
            isAvailable: false,
            availabilityStatus: "out_of_stock",
        };
    }

    if (inventoryRead.stockQuantity < quantity) {
        return {
            isAvailable: false,
            availabilityStatus: "insufficient_stock",
        };
    }

    return {
        isAvailable: true,
        availabilityStatus: "available",
    };
}

export function buildOrderItemsFromCheckout({
    checkoutItems = [],
    catalogReads = [],
    inventoryReads = [],
} = {}) {
    const catalogByVariantId = createCatalogReadMap(catalogReads);
    const inventoryByVariantId = createInventoryReadMap(inventoryReads);

    return checkoutItems.map((checkoutItem) => {
        const catalogRead = catalogByVariantId.get(checkoutItem.variantId);
        const inventoryRead = inventoryByVariantId.get(checkoutItem.variantId);
        const availability = resolveOrderItemAvailability({
            catalogRead,
            inventoryRead,
            quantity: checkoutItem.quantity,
        });

        if (!availability.isAvailable) {
            throw createOrderCheckoutError(
                `Checkout item is unavailable for variant: ${checkoutItem.variantId}`,
                {
                    variantId: checkoutItem.variantId,
                    quantity: checkoutItem.quantity,
                    availabilityStatus: availability.availabilityStatus,
                }
            );
        }

        return createOrderItem({
            productId: catalogRead.productId,
            variantId: checkoutItem.variantId,
            sku: catalogRead.sku,
            productName: catalogRead.productTitle,
            variantLabel: composeVariantLabel(catalogRead.variantAttributes),
            thumbnailUrl: catalogRead.thumbnailUrl,
            unitPrice: catalogRead.salePrice,
            quantity: checkoutItem.quantity,
            lineTotal: catalogRead.salePrice * checkoutItem.quantity,
        });
    });
}

export function createPendingOrderDocument({
    accountId = null,
    phoneNumber,
    shippingAddressLine,
    paymentMethod = "cod",
    stockCommitStatus = paymentMethod === "cod" ? "committed" : "not_committed",
    items = [],
    requester,
    timestamp = new Date(),
    orderCode = generateOrderCode({ timestamp }),
} = {}) {
    const subtotal = items.reduce(
        (total, item) => total + (typeof item.lineTotal === "number" ? item.lineTotal : 0),
        0
    );

    return createOrder({
        orderCode,
        accountId,
        phoneNumber,
        shippingAddressLine,
        paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        stockCommitStatus,
        items,
        subtotal,
        discountTotal: 0,
        shippingFee: 0,
        grandTotal: subtotal,
        statusLogs: [
            createOrderStatusLog({
                fromStatus: null,
                toStatus: "pending",
                changedBy: createOrderActor(requester),
                changedAt: timestamp,
            }),
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
    });
}

export async function createOrderWithRetry({
    orderRepository,
    baseDocument,
    maxAttempts = 5,
    random = Math.random,
    timestamp = new Date(),
} = {}) {
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const orderDocument = createOrder({
            ...baseDocument,
            orderCode: generateOrderCode({
                timestamp,
                random,
            }),
        });

        try {
            await orderRepository.createOrder({
                document: orderDocument,
            });

            return orderDocument;
        } catch (error) {
            lastError = error;

            if (error?.code !== 11000) {
                throw error;
            }
        }
    }

    throw lastError;
}

export async function rollbackDecrementedStock({
    inventoryAdapter,
    adjustedItems = [],
    logger = console,
} = {}) {
    for (const item of adjustedItems) {
        try {
            await inventoryAdapter.incrementStockQuantityByVariantId({
                variantId: item.variantId,
                quantity: item.quantity,
            });
        } catch (error) {
            logger.error?.("Failed to compensate order stock decrement", {
                variantId: item.variantId,
                quantity: item.quantity,
                error: {
                    message: error?.message ?? "Unknown error",
                    code: error?.code ?? null,
                },
            });
        }
    }
}

export async function rollbackIncrementedStock({
    inventoryAdapter,
    adjustedItems = [],
    logger = console,
} = {}) {
    for (const item of adjustedItems) {
        try {
            await inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable({
                variantId: item.variantId,
                quantity: item.quantity,
            });
        } catch (error) {
            logger.error?.("Failed to compensate order stock increment", {
                variantId: item.variantId,
                quantity: item.quantity,
                error: {
                    message: error?.message ?? "Unknown error",
                    code: error?.code ?? null,
                },
            });
        }
    }
}

export function buildOrderStatusLog({
    fromStatus,
    toStatus,
    requester,
    changedAt = new Date(),
} = {}) {
    return createOrderStatusLog({
        fromStatus,
        toStatus,
        changedBy: createOrderActor(requester),
        changedAt,
    });
}

export function assertOrderAccessibleForPublicDetail({
    order,
    requester,
    orderId,
} = {}) {
    if (!order) {
        throw createOrderNotFoundError(`Order not found: ${orderId}`, {
            orderId,
        });
    }

    if (requester?.role === "admin") {
        throw createOrderForbiddenError("Admin accounts must use admin order routes");
    }

    if (requester?.role === "customer" && requester?.accountId) {
        if (order.accountId !== requester.accountId) {
            throw createOrderNotFoundError(`Order not found: ${orderId}`, {
                orderId,
            });
        }

        return order;
    }

    if (order.accountId !== null) {
        throw createOrderNotFoundError(`Order not found: ${orderId}`, {
            orderId,
        });
    }

    return order;
}

export function assertOrderOwnedByCustomer({ order, requester, orderId } = {}) {
    if (!order || order.accountId !== requester.accountId) {
        throw createOrderNotFoundError(`Order not found: ${orderId}`, {
            orderId,
        });
    }

    return order;
}

export function assertOrderExists(order, orderId) {
    if (!order) {
        throw createOrderNotFoundError(`Order not found: ${orderId}`, {
            orderId,
        });
    }

    return order;
}

export function assertOrderCancelable(order) {
    if (!["pending", "confirmed"].includes(order?.orderStatus)) {
        throw createOrderCancellationNotAllowedError(
            `Order cannot be cancelled from status: ${order?.orderStatus ?? "unknown"}`,
            {
                orderId: toIdString(order?._id),
                orderStatus: order?.orderStatus ?? null,
            }
        );
    }

    return order;
}

export function assertAdminStatusTransition({ order, toStatus } = {}) {
    if (order?.paymentMethod === "vnpay" && order?.paymentStatus !== "paid") {
        throw createOrderStatusTransitionError(
            `Cannot transition unpaid VNPAY order from ${order?.orderStatus ?? "unknown"} to ${toStatus}`,
            {
                orderId: toIdString(order?._id),
                fromStatus: order?.orderStatus ?? null,
                toStatus,
                paymentStatus: order?.paymentStatus ?? null,
                paymentMethod: order?.paymentMethod ?? null,
            }
        );
    }

    if (order?.orderStatus === "pending" && toStatus === "confirmed") {
        return;
    }

    if (order?.orderStatus === "confirmed" && toStatus === "completed") {
        return;
    }

    throw createOrderStatusTransitionError(
        `Cannot transition order from ${order?.orderStatus ?? "unknown"} to ${toStatus}`,
        {
            orderId: toIdString(order?._id),
            fromStatus: order?.orderStatus ?? null,
            toStatus,
        }
    );
}

export function createStockConflictError({ variantId, quantity } = {}) {
    return createOrderConflictError(
        `Stock changed during checkout for variant: ${variantId}`,
        {
            variantId,
            quantity,
            availabilityStatus: "insufficient_stock",
        }
    );
}

export function assertKnownOrderStatus(value, fieldName) {
    if (!ORDER_STATUSES.includes(value)) {
        throw new Error(`Ordering requires ${fieldName} to be a known order status`);
    }

    return value;
}
