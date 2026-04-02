import { ORDERING_MODULE_NAME } from "../constants/index.js";

export function createOrderingHealthPayload() {
    return {
        ok: true,
        module: ORDERING_MODULE_NAME,
    };
}

export function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

export function composeVariantLabel(variantAttributes) {
    if (
        typeof variantAttributes !== "object" ||
        variantAttributes === null ||
        Array.isArray(variantAttributes)
    ) {
        return null;
    }

    const segments = [
        variantAttributes.ram,
        variantAttributes.rom,
        variantAttributes.color,
    ].filter((segment) => typeof segment === "string" && segment.trim().length > 0);

    return segments.length > 0 ? segments.join(" / ") : null;
}

export function createOrderActor({ role, accountId } = {}) {
    if (role === "admin" && typeof accountId === "string" && accountId.length > 0) {
        return `admin:${accountId}`;
    }

    if (role === "customer" && typeof accountId === "string" && accountId.length > 0) {
        return `customer:${accountId}`;
    }

    return "guest";
}

function formatOrderCodeDate(timestamp) {
    const year = timestamp.getUTCFullYear().toString();
    const month = `${timestamp.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${timestamp.getUTCDate()}`.padStart(2, "0");

    return `${year}${month}${day}`;
}

export function generateOrderCode({
    timestamp = new Date(),
    random = Math.random,
} = {}) {
    const dateCode = formatOrderCodeDate(timestamp);
    const suffix = `${Math.floor(random() * 1000000)}`.padStart(6, "0");

    return `ORD-${dateCode}-${suffix}`;
}

export function composeShippingAddressLine({
    street,
    wardName,
    districtName,
    provinceName,
} = {}) {
    return [street, wardName, districtName, provinceName]
        .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
        .map((segment) => segment.trim())
        .join(", ");
}

function createOrderItemView(item) {
    return {
        productId: toIdString(item?.productId),
        variantId: toIdString(item?.variantId),
        sku: item?.sku ?? null,
        productName: item?.productName ?? null,
        variantLabel: item?.variantLabel ?? null,
        thumbnailUrl: item?.thumbnailUrl ?? null,
        unitPrice: item?.unitPrice ?? null,
        quantity: item?.quantity ?? 0,
        lineTotal: item?.lineTotal ?? null,
    };
}

function createOrderStatusLogView(log) {
    return {
        fromStatus: log?.fromStatus ?? null,
        toStatus: log?.toStatus ?? null,
        changedBy: log?.changedBy ?? null,
        changedAt: log?.changedAt ?? null,
    };
}

export function createOrderSummaryView(order) {
    return {
        id: toIdString(order?._id),
        orderCode: order?.orderCode ?? null,
        accountId: order?.accountId ?? null,
        recipientName: order?.recipientName ?? null,
        phoneNumber: order?.phoneNumber ?? null,
        street: order?.street ?? null,
        provinceCode: order?.provinceCode ?? null,
        provinceName: order?.provinceName ?? null,
        districtCode: order?.districtCode ?? null,
        districtName: order?.districtName ?? null,
        wardCode: order?.wardCode ?? null,
        wardName: order?.wardName ?? null,
        shippingAddressLine: order?.shippingAddressLine ?? null,
        paymentMethod: order?.paymentMethod ?? null,
        paymentStatus: order?.paymentStatus ?? null,
        orderStatus: order?.orderStatus ?? null,
        itemCount: Array.isArray(order?.items) ? order.items.length : 0,
        subtotal: order?.subtotal ?? 0,
        discountTotal: order?.discountTotal ?? 0,
        shippingFee: order?.shippingFee ?? 0,
        grandTotal: order?.grandTotal ?? 0,
        createdAt: order?.createdAt ?? null,
        updatedAt: order?.updatedAt ?? null,
    };
}

export function createOrderDetailView(order) {
    return {
        ...createOrderSummaryView(order),
        items: Array.isArray(order?.items)
            ? order.items.map((item) => createOrderItemView(item))
            : [],
        statusLogs: Array.isArray(order?.statusLogs)
            ? order.statusLogs.map((log) => createOrderStatusLogView(log))
            : [],
    };
}
