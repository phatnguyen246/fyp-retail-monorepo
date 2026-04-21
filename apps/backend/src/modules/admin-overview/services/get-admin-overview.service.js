import { createInventoryRecordView } from "../../inventory/utils/index.js";
import { createOrderSummaryView } from "../../ordering/utils/index.js";

const NON_DELETED_PRODUCT_FILTER = Object.freeze({
    isDeleted: {
        $ne: true,
    },
});

function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

function createEntityMap(entities = []) {
    const entityMap = new Map();

    for (const entity of entities) {
        const entityId = toIdString(entity?._id);

        if (!entityId) {
            continue;
        }

        entityMap.set(entityId, entity);
    }

    return entityMap;
}

function composeVariantLabel(variantAttributes) {
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
        variantAttributes.colorFullName ?? variantAttributes.color,
    ].filter((segment) => typeof segment === "string" && segment.trim().length > 0);

    return segments.length > 0 ? segments.join(" / ") : null;
}

function toNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0 ? value : 0;
}

function createChartBreakdown(entries = []) {
    return entries.map((entry) => ({
        key: entry.key,
        value: toNonNegativeInteger(entry.value),
    }));
}

function createChartDataset({ key, label, data = [] } = {}) {
    return {
        key,
        label,
        data: data.map((value) =>
            typeof value === "number" && Number.isFinite(value) && value >= 0
                ? value
                : 0
        ),
    };
}

function createSingleSeriesChart({ labels = [], datasetKey, datasetLabel, data = [] } = {}) {
    return {
        labels,
        datasets: [
            createChartDataset({
                key: datasetKey,
                label: datasetLabel,
                data,
            }),
        ],
    };
}

function composeLowStockChartLabel(record = {}) {
    if (typeof record?.productName === "string" && record.productName.length > 0) {
        if (typeof record?.variantLabel === "string" && record.variantLabel.length > 0) {
            return `${record.productName} (${record.variantLabel})`;
        }

        return record.productName;
    }

    return `Variant ${record?.variantId ?? "unknown"}`;
}

function createProductStatusChart({
    totalProducts,
    draftProducts,
    activeProducts,
    inactiveProducts,
    discontinuedProducts,
} = {}) {
    const breakdown = createChartBreakdown([
        { key: "draft", value: draftProducts },
        { key: "active", value: activeProducts },
        { key: "inactive", value: inactiveProducts },
        { key: "discontinued", value: discontinuedProducts },
    ]);

    return {
        total: toNonNegativeInteger(totalProducts),
        breakdown,
        ...createSingleSeriesChart({
            labels: breakdown.map((entry) => entry.key),
            datasetKey: "productStatus",
            datasetLabel: "productCount",
            data: breakdown.map((entry) => entry.value),
        }),
    };
}

function createOrderStatusChart({
    totalOrders,
    pendingOrders,
    confirmedOrders,
    completedOrders,
    cancelledOrders,
} = {}) {
    const breakdown = createChartBreakdown([
        { key: "pending", value: pendingOrders },
        { key: "confirmed", value: confirmedOrders },
        { key: "completed", value: completedOrders },
        { key: "cancelled", value: cancelledOrders },
    ]);

    return {
        total: toNonNegativeInteger(totalOrders),
        breakdown,
        ...createSingleSeriesChart({
            labels: breakdown.map((entry) => entry.key),
            datasetKey: "orderStatus",
            datasetLabel: "orderCount",
            data: breakdown.map((entry) => entry.value),
        }),
    };
}

function createPaymentStatusChart({
    totalOrders,
    paymentPendingOrders,
    paidOrders,
    failedOrders,
    cancelledPaymentOrders,
    vnpayPendingOrders,
} = {}) {
    const breakdown = createChartBreakdown([
        { key: "pending", value: paymentPendingOrders },
        { key: "paid", value: paidOrders },
        { key: "failed", value: failedOrders },
        { key: "cancelled", value: cancelledPaymentOrders },
    ]);

    return {
        total: toNonNegativeInteger(totalOrders),
        highlighted: {
            vnpayPending: toNonNegativeInteger(vnpayPendingOrders),
        },
        breakdown,
        ...createSingleSeriesChart({
            labels: breakdown.map((entry) => entry.key),
            datasetKey: "paymentStatus",
            datasetLabel: "orderCount",
            data: breakdown.map((entry) => entry.value),
        }),
    };
}

function createInventoryRiskChart({
    totalInventoryRecords,
    lowStockCount,
    outOfStockCount,
} = {}) {
    const total = toNonNegativeInteger(totalInventoryRecords);
    const lowStockTotal = toNonNegativeInteger(lowStockCount);
    const outOfStock = Math.min(toNonNegativeInteger(outOfStockCount), lowStockTotal);
    const lowStockInStock = Math.max(lowStockTotal - outOfStock, 0);
    const healthy = Math.max(total - lowStockTotal, 0);
    const breakdown = createChartBreakdown([
        { key: "healthy", value: healthy },
        { key: "lowStock", value: lowStockInStock },
        { key: "outOfStock", value: outOfStock },
    ]);

    return {
        total,
        breakdown,
        ...createSingleSeriesChart({
            labels: breakdown.map((entry) => entry.key),
            datasetKey: "inventoryRisk",
            datasetLabel: "inventoryRecordCount",
            data: breakdown.map((entry) => entry.value),
        }),
    };
}

function createLowStockTopChart(lowStockRecords = []) {
    const records = lowStockRecords.map((record) => {
        const stockQuantity = toNonNegativeInteger(record?.stockQuantity);
        const lowStockThreshold = toNonNegativeInteger(record?.lowStockThreshold);

        return {
            ...record,
            chartLabel: composeLowStockChartLabel(record),
            shortageQuantity: Math.max(lowStockThreshold - stockQuantity, 0),
            stockQuantity,
            lowStockThreshold,
        };
    });

    return {
        labels: records.map((record) => record.chartLabel),
        datasets: [
            createChartDataset({
                key: "stockQuantity",
                label: "stockQuantity",
                data: records.map((record) => record.stockQuantity),
            }),
            createChartDataset({
                key: "lowStockThreshold",
                label: "lowStockThreshold",
                data: records.map((record) => record.lowStockThreshold),
            }),
            createChartDataset({
                key: "shortageQuantity",
                label: "shortageQuantity",
                data: records.map((record) => record.shortageQuantity),
            }),
        ],
        records,
    };
}

async function hydrateLowStockPreview({
    lowStockPreview = [],
    variantRepository,
    productRepository,
} = {}) {
    const variantIds = lowStockPreview
        .map((inventoryRecord) => toIdString(inventoryRecord?.variantId))
        .filter(Boolean);
    const variants = await variantRepository.findVariantsByIds({
        variantIds,
        projection: {
            _id: 1,
            productId: 1,
            sku: 1,
            variantAttributes: 1,
        },
    });
    const variantMap = createEntityMap(variants);
    const productIds = variants
        .map((variant) => toIdString(variant?.productId))
        .filter(Boolean);
    const products = await productRepository.findProductsByIds({
        productIds,
        projection: {
            _id: 1,
            productGroupCode: 1,
            title: 1,
        },
    });
    const productMap = createEntityMap(products);

    return lowStockPreview.map((inventoryRecord) => {
        const variant = variantMap.get(toIdString(inventoryRecord?.variantId));
        const product = productMap.get(toIdString(variant?.productId));

        return {
            ...createInventoryRecordView(inventoryRecord),
            productId: toIdString(product?._id),
            productName: product?.title ?? null,
            productGroupCode: product?.productGroupCode ?? null,
            sku: variant?.sku ?? null,
            variantLabel: composeVariantLabel(variant?.variantAttributes),
        };
    });
}

export function createGetAdminOverviewService({
    productRepository,
    variantRepository,
    orderRepository,
    inventoryRepository,
} = {}) {
    return async function getAdminOverview() {
        const [
            totalProducts,
            draftProducts,
            activeProducts,
            inactiveProducts,
            discontinuedProducts,
            deletedProducts,
            outOfStockProducts,
            totalOrders,
            pendingOrders,
            confirmedOrders,
            completedOrders,
            cancelledOrders,
            paymentPendingOrders,
            paidOrders,
            failedOrders,
            cancelledPaymentOrders,
            vnpayPendingOrders,
            recentOrders,
            totalInventoryRecords,
            lowStockCount,
            outOfStockCount,
            lowStockPreview,
        ] = await Promise.all([
            productRepository.countProductsByFilter({
                filter: NON_DELETED_PRODUCT_FILTER,
            }),
            productRepository.countProductsByFilter({
                filter: {
                    ...NON_DELETED_PRODUCT_FILTER,
                    status: "draft",
                },
            }),
            productRepository.countProductsByFilter({
                filter: {
                    ...NON_DELETED_PRODUCT_FILTER,
                    status: "active",
                },
            }),
            productRepository.countProductsByFilter({
                filter: {
                    ...NON_DELETED_PRODUCT_FILTER,
                    status: "inactive",
                },
            }),
            productRepository.countProductsByFilter({
                filter: {
                    ...NON_DELETED_PRODUCT_FILTER,
                    status: "discontinued",
                },
            }),
            productRepository.countProductsByFilter({
                filter: {
                    isDeleted: true,
                },
            }),
            productRepository.countProductsByFilter({
                filter: {
                    ...NON_DELETED_PRODUCT_FILTER,
                    hasActiveVariants: true,
                    hasInStockVariants: false,
                },
            }),
            orderRepository.countOrdersByFilter(),
            orderRepository.countOrdersByFilter({
                filter: {
                    orderStatus: "pending",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    orderStatus: "confirmed",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    orderStatus: "completed",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    orderStatus: "cancelled",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    paymentStatus: "pending",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    paymentStatus: "paid",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    paymentStatus: "failed",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    paymentStatus: "cancelled",
                },
            }),
            orderRepository.countOrdersByFilter({
                filter: {
                    paymentMethod: "vnpay",
                    paymentStatus: "pending",
                },
            }),
            orderRepository.findOrdersByFilter({
                sort: {
                    createdAt: -1,
                },
                limit: 5,
            }),
            inventoryRepository.countInventoryRecordsByFilter(),
            inventoryRepository.countLowStockInventoryRecords(),
            inventoryRepository.countOutOfStockInventoryRecords(),
            inventoryRepository.findLowStockInventoryRecords({
                limit: 6,
            }),
        ]);
        const lowStockRecords = await hydrateLowStockPreview({
            lowStockPreview,
            variantRepository,
            productRepository,
        });

        return {
            productMeta: {
                total: totalProducts,
                draft: draftProducts,
                active: activeProducts,
                inactive: inactiveProducts,
                discontinued: discontinuedProducts,
                deleted: deletedProducts,
                outOfStock: outOfStockProducts,
            },
            orderMeta: {
                total: totalOrders,
                pending: pendingOrders,
                confirmed: confirmedOrders,
                completed: completedOrders,
                cancelled: cancelledOrders,
                vnpayPending: vnpayPendingOrders,
            },
            paymentMeta: {
                total: totalOrders,
                pending: paymentPendingOrders,
                paid: paidOrders,
                failed: failedOrders,
                cancelled: cancelledPaymentOrders,
                vnpayPending: vnpayPendingOrders,
            },
            lowStockMeta: {
                total: lowStockCount,
                outOfStock: outOfStockCount,
            },
            recentOrders: recentOrders.map((order) =>
                createOrderSummaryView(order)
            ),
            lowStockRecords,
            charts: {
                productStatus: createProductStatusChart({
                    totalProducts,
                    draftProducts,
                    activeProducts,
                    inactiveProducts,
                    discontinuedProducts,
                }),
                orderStatus: createOrderStatusChart({
                    totalOrders,
                    pendingOrders,
                    confirmedOrders,
                    completedOrders,
                    cancelledOrders,
                }),
                paymentStatus: createPaymentStatusChart({
                    totalOrders,
                    paymentPendingOrders,
                    paidOrders,
                    failedOrders,
                    cancelledPaymentOrders,
                    vnpayPendingOrders,
                }),
                inventoryRisk: createInventoryRiskChart({
                    totalInventoryRecords,
                    lowStockCount,
                    outOfStockCount,
                }),
                lowStockTop: createLowStockTopChart(lowStockRecords),
            },
        };
    };
}
