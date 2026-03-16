import { createOrderDetailView } from "../utils/index.js";
import {
    assertOrderCreateAllowed,
    buildOrderItemsFromCheckout,
    createOrderRequester,
    createOrderWithRetry,
    createPendingOrderDocument,
    createStockConflictError,
    rollbackDecrementedStock,
} from "./ordering-service.helpers.js";
import { createOrderCheckoutError } from "./ordering-service.errors.js";

export function createCreateOrderService({
    cartAdapter,
    catalogAdapter,
    inventoryAdapter,
    orderRepository,
    validation,
    logger = console,
} = {}) {
    return async function createOrder({
        owner,
        requester,
        input,
    } = {}) {
        const parsedInput = validation.parseCreateOrderInput(input ?? {});
        const normalizedRequester = createOrderRequester(requester);

        assertOrderCreateAllowed(normalizedRequester);

        const checkoutItemsResult = await cartAdapter.readCheckoutItems({
            owner,
            variantIds: parsedInput.cartVariantIds,
        });

        if (checkoutItemsResult.missingVariantIds.length > 0) {
            throw createOrderCheckoutError("Some cart items are unavailable for checkout", {
                missingVariantIds: checkoutItemsResult.missingVariantIds,
            });
        }

        const [catalogReads, inventoryReads] = await Promise.all([
            catalogAdapter.readVariantsForOrder({
                variantIds: parsedInput.cartVariantIds,
            }),
            inventoryAdapter.readInventoryByVariantIds({
                variantIds: parsedInput.cartVariantIds,
            }),
        ]);
        const items = buildOrderItemsFromCheckout({
            checkoutItems: checkoutItemsResult.items,
            catalogReads,
            inventoryReads,
        });
        const stockAdjustedItems = [];

        try {
            for (const item of items) {
                try {
                    const updatedInventory =
                        await inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable({
                            variantId: item.variantId,
                            quantity: item.quantity,
                        });

                    if (!updatedInventory) {
                        throw createStockConflictError({
                            variantId: item.variantId.toHexString(),
                            quantity: item.quantity,
                        });
                    }

                    stockAdjustedItems.push({
                        variantId: item.variantId.toHexString(),
                        quantity: item.quantity,
                    });
                } catch (error) {
                    if (error?.stockAdjusted === true) {
                        stockAdjustedItems.push({
                            variantId: item.variantId.toHexString(),
                            quantity: item.quantity,
                        });
                    }

                    throw error;
                }
            }

            const timestamp = new Date();
            const orderDocument = await createOrderWithRetry({
                orderRepository,
                baseDocument: createPendingOrderDocument({
                    accountId: normalizedRequester.accountId,
                    phoneNumber: parsedInput.phoneNumber,
                    shippingAddressLine: parsedInput.shippingAddressLine,
                    paymentMethod: parsedInput.paymentMethod,
                    items,
                    requester: normalizedRequester,
                    timestamp,
                }),
                timestamp,
            });

            try {
                await cartAdapter.removeCheckedOutItems({
                    owner,
                    variantIds: parsedInput.cartVariantIds,
                });
            } catch (error) {
                logger.error?.("Failed to cleanup purchased cart items", {
                    orderId: orderDocument._id.toHexString(),
                    variantIds: parsedInput.cartVariantIds,
                    error: {
                        message: error?.message ?? "Unknown error",
                        code: error?.code ?? null,
                    },
                });
            }

            return createOrderDetailView(orderDocument);
        } catch (error) {
            await rollbackDecrementedStock({
                inventoryAdapter,
                adjustedItems: stockAdjustedItems,
                logger,
            });
            throw error;
        }
    };
}
