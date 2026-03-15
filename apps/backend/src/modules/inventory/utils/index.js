import {
    DEFAULT_LOW_STOCK_THRESHOLD,
    INVENTORY_MODULE_NAME,
} from "../constants/index.js";

export function createInventoryHealthPayload() {
    return {
        ok: true,
        module: INVENTORY_MODULE_NAME,
    };
}

export function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

export function createInventoryRecordView(record, { variantId } = {}) {
    if (!record) {
        return {
            id: null,
            variantId: toIdString(variantId),
            stockQuantity: 0,
            lowStockThreshold: null,
            isInStock: false,
            isLowStock: false,
            recordExists: false,
            createdAt: null,
            updatedAt: null,
        };
    }

    const stockQuantity =
        typeof record.stockQuantity === "number" ? record.stockQuantity : 0;
    const lowStockThreshold =
        typeof record.lowStockThreshold === "number"
            ? record.lowStockThreshold
            : DEFAULT_LOW_STOCK_THRESHOLD;

    return {
        id: toIdString(record._id),
        variantId: toIdString(record.variantId) ?? toIdString(variantId),
        stockQuantity,
        lowStockThreshold,
        isInStock: stockQuantity > 0,
        isLowStock: stockQuantity <= lowStockThreshold,
        recordExists: true,
        createdAt: record.createdAt ?? null,
        updatedAt: record.updatedAt ?? null,
    };
}

export function createInventoryReadView(record, { variantId } = {}) {
    const view = createInventoryRecordView(record, { variantId });

    return {
        variantId: view.variantId,
        stockQuantity: view.stockQuantity,
        isInStock: view.isInStock,
    };
}
