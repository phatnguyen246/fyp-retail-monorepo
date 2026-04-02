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
            vnpayPendingOrders,
            recentOrders,
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
            lowStockMeta: {
                total: lowStockCount,
                outOfStock: outOfStockCount,
            },
            recentOrders: recentOrders.map((order) =>
                createOrderSummaryView(order)
            ),
            lowStockRecords,
        };
    };
}
