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
    paymentCheckoutAdapter,
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
        const shouldCommitStockOnCheckout = parsedInput.paymentMethod === "cod";
        const stockAdjustedItems = [];
        let orderDocument = null;

        try {
            if (shouldCommitStockOnCheckout) {
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
            }

            const timestamp = new Date();
            orderDocument = await createOrderWithRetry({
                orderRepository,
                baseDocument: createPendingOrderDocument({
                    accountId: normalizedRequester.accountId,
                    phoneNumber: parsedInput.phoneNumber,
                    shippingAddressLine: parsedInput.shippingAddressLine,
                    paymentMethod: parsedInput.paymentMethod,
                    stockCommitStatus: shouldCommitStockOnCheckout
                        ? "committed"
                        : "not_committed",
                    items,
                    requester: normalizedRequester,
                    timestamp,
                }),
                timestamp,
            });

            await paymentCheckoutAdapter.createInitialPaymentForOrder({
                order: orderDocument,
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
            if (orderDocument?._id) {
                try {
                    await orderRepository.deleteOrderById({
                        orderId: orderDocument._id,
                    });
                } catch (cleanupError) {
                    logger.error?.("Failed to rollback order after checkout payment init error", {
                        orderId: orderDocument._id.toHexString(),
                        error: {
                            message: cleanupError?.message ?? "Unknown error",
                            code: cleanupError?.code ?? null,
                        },
                    });
                }
            }

            await rollbackDecrementedStock({
                inventoryAdapter,
                adjustedItems: stockAdjustedItems,
                logger,
            });
            throw error;
        }
    };
}
