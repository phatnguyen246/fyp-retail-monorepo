import { createCart, createCartItem } from "../models/index.js";
import {
    composeVariantLabel,
    createCartOwnerKey,
    toIdString,
} from "../utils/index.js";
import {
    createCartQuantityConflictError,
    createCartVariantUnavailableError,
} from "./cart-service.errors.js";

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

function createInventoryFallback(variantId) {
    return {
        variantId,
        stockQuantity: 0,
        isInStock: false,
    };
}

export function hasCartOwner(owner) {
    return createCartOwnerKey(owner) !== null;
}

export function assertCartOwner(owner) {
    if (!hasCartOwner(owner)) {
        throw new Error("Cart services require a valid owner");
    }

    return {
        ownerType: owner.ownerType.trim(),
        ownerKey: owner.ownerKey.trim(),
    };
}

export function createEmptyCartView({ cartId = null } = {}) {
    return {
        id: cartId,
        items: [],
        summary: {
            totalQuantity: 0,
            selectedQuantity: 0,
            totalAmount: 0,
        },
    };
}

export function findCartItemIndex(cart, variantId) {
    return (cart?.items ?? []).findIndex(
        (item) => toIdString(item?.variantId) === variantId
    );
}

export function createCartDocument({ owner, items = [], timestamp = new Date() } = {}) {
    const normalizedOwner = assertCartOwner(owner);

    return createCart({
        ownerType: normalizedOwner.ownerType,
        ownerKey: normalizedOwner.ownerKey,
        items,
        createdAt: timestamp,
        updatedAt: timestamp,
    });
}

export function createCartLine({
    variantId,
    quantity,
    selected = true,
    addedAt = new Date(),
} = {}) {
    return createCartItem({
        variantId,
        quantity,
        selected,
        addedAt,
    });
}

export async function readCartDependencies({
    catalogAdapter,
    inventoryAdapter,
    variantIds = [],
} = {}) {
    const normalizedVariantIds = [
        ...new Set(variantIds.map(toIdString).filter(Boolean)),
    ];

    if (normalizedVariantIds.length === 0) {
        return {
            catalogByVariantId: new Map(),
            inventoryByVariantId: new Map(),
        };
    }

    const [catalogReads, inventoryReads] = await Promise.all([
        catalogAdapter.readVariantsForCart({
            variantIds: normalizedVariantIds,
        }),
        inventoryAdapter.readInventoryByVariantIds({
            variantIds: normalizedVariantIds,
        }),
    ]);

    return {
        catalogByVariantId: createCatalogReadMap(catalogReads),
        inventoryByVariantId: createInventoryReadMap(inventoryReads),
    };
}

export function resolveCartItemAvailability({
    catalogRead,
    inventoryRead,
    quantity,
} = {}) {
    if (!catalogRead?.variantExists) {
        return {
            isAvailable: false,
            availabilityStatus: "variant_missing",
            availabilityMessage: "This variant is no longer available.",
        };
    }

    if (catalogRead.variantIsDeleted === true) {
        return {
            isAvailable: false,
            availabilityStatus: "variant_deleted",
            availabilityMessage: "This variant is no longer available.",
        };
    }

    if (!catalogRead?.productExists) {
        return {
            isAvailable: false,
            availabilityStatus: "product_missing",
            availabilityMessage: "This product is no longer available.",
        };
    }

    if (catalogRead.productIsDeleted === true) {
        return {
            isAvailable: false,
            availabilityStatus: "product_deleted",
            availabilityMessage: "This product is no longer available.",
        };
    }

    if (catalogRead.variantStatus !== "active") {
        return {
            isAvailable: false,
            availabilityStatus: "variant_inactive",
            availabilityMessage: "This variant is currently unavailable.",
        };
    }

    if (catalogRead.productStatus !== "active") {
        return {
            isAvailable: false,
            availabilityStatus: "product_inactive",
            availabilityMessage: "This product is currently unavailable.",
        };
    }

    if (inventoryRead?.isInStock !== true || inventoryRead?.stockQuantity < 1) {
        return {
            isAvailable: false,
            availabilityStatus: "out_of_stock",
            availabilityMessage: "This item is out of stock.",
        };
    }

    if (inventoryRead.stockQuantity < quantity) {
        const suffix = inventoryRead.stockQuantity === 1 ? "" : "s";

        return {
            isAvailable: false,
            availabilityStatus: "insufficient_stock",
            availabilityMessage: `Only ${inventoryRead.stockQuantity} item${suffix} available.`,
        };
    }

    return {
        isAvailable: true,
        availabilityStatus: "available",
        availabilityMessage: null,
    };
}

export function assertCartItemPurchasable({
    catalogRead,
    inventoryRead,
    quantity,
    variantId,
} = {}) {
    const availability = resolveCartItemAvailability({
        catalogRead,
        inventoryRead,
        quantity,
    });

    if (availability.isAvailable) {
        return availability;
    }

    if (availability.availabilityStatus === "insufficient_stock") {
        throw createCartQuantityConflictError(
            `Requested quantity exceeds stock for variant: ${variantId}`,
            {
                variantId,
                requestedQuantity: quantity,
                availableQuantity: inventoryRead?.stockQuantity ?? 0,
                availabilityStatus: availability.availabilityStatus,
            }
        );
    }

    throw createCartVariantUnavailableError(
        `Variant cannot be purchased: ${variantId}`,
        {
            variantId,
            requestedQuantity: quantity,
            availabilityStatus: availability.availabilityStatus,
        }
    );
}

export function buildCartItemView(item, { catalogRead, inventoryRead } = {}) {
    const resolvedCatalogRead = catalogRead ?? {
        variantId: toIdString(item?.variantId),
        variantExists: false,
        productExists: false,
        productId: null,
        productTitle: null,
        variantAttributes: null,
        salePrice: null,
        currency: null,
        thumbnailUrl: null,
    };
    const resolvedInventoryRead =
        inventoryRead ?? createInventoryFallback(toIdString(item?.variantId));
    const availability = resolveCartItemAvailability({
        catalogRead: resolvedCatalogRead,
        inventoryRead: resolvedInventoryRead,
        quantity: item.quantity,
    });
    const unitPrice =
        typeof resolvedCatalogRead.salePrice === "number"
            ? resolvedCatalogRead.salePrice
            : null;
    const lineTotal =
        typeof unitPrice === "number" ? unitPrice * item.quantity : null;

    return {
        variantId: toIdString(item.variantId),
        productId: resolvedCatalogRead.productId ?? null,
        productName: resolvedCatalogRead.productTitle ?? null,
        variantLabel: composeVariantLabel(resolvedCatalogRead.variantAttributes),
        thumbnailUrl: resolvedCatalogRead.thumbnailUrl ?? null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        currency: resolvedCatalogRead.currency ?? null,
        selected: item.selected === true,
        isAvailable: availability.isAvailable,
        availabilityStatus: availability.availabilityStatus,
        availabilityMessage: availability.availabilityMessage,
    };
}

export function buildCartSummary(itemViews = []) {
    return itemViews.reduce(
        (summary, itemView) => {
            summary.totalQuantity += itemView.quantity;

            if (itemView.selected === true && itemView.isAvailable === true) {
                summary.selectedQuantity += itemView.quantity;

                if (typeof itemView.lineTotal === "number") {
                    summary.totalAmount += itemView.lineTotal;
                }
            }

            return summary;
        },
        {
            totalQuantity: 0,
            selectedQuantity: 0,
            totalAmount: 0,
        }
    );
}

export function buildCartView({ cart, itemViews = [] } = {}) {
    return {
        id: toIdString(cart?._id),
        items: itemViews,
        summary: buildCartSummary(itemViews),
    };
}

export async function reconcileCartDocument({
    cart,
    catalogAdapter,
    inventoryAdapter,
} = {}) {
    if (!cart) {
        return {
            cart,
            changed: false,
            view: createEmptyCartView(),
        };
    }

    const variantIds = (cart.items ?? []).map((item) => item?.variantId);

    if (variantIds.length === 0) {
        return {
            cart,
            changed: false,
            view: createEmptyCartView({
                cartId: toIdString(cart._id),
            }),
        };
    }

    const { catalogByVariantId, inventoryByVariantId } = await readCartDependencies({
        catalogAdapter,
        inventoryAdapter,
        variantIds,
    });
    let changed = false;
    const nextItems = cart.items.map((item) => {
        const variantId = toIdString(item.variantId);
        const availability = resolveCartItemAvailability({
            catalogRead: catalogByVariantId.get(variantId),
            inventoryRead:
                inventoryByVariantId.get(variantId) ?? createInventoryFallback(variantId),
            quantity: item.quantity,
        });

        if (item.selected === true && availability.isAvailable !== true) {
            changed = true;

            return {
                ...item,
                selected: false,
            };
        }

        return item;
    });
    const reconciledCart = changed
        ? {
              ...cart,
              items: nextItems,
          }
        : cart;
    const itemViews = nextItems.map((item) => {
        const variantId = toIdString(item.variantId);

        return buildCartItemView(item, {
            catalogRead: catalogByVariantId.get(variantId),
            inventoryRead:
                inventoryByVariantId.get(variantId) ?? createInventoryFallback(variantId),
        });
    });

    return {
        cart: reconciledCart,
        changed,
        view: buildCartView({
            cart: reconciledCart,
            itemViews,
        }),
    };
}
