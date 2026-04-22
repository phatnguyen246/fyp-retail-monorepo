import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    createAddCartItemService,
    createClearCartService,
    createGetCartService,
    createMergeGuestCartToCustomerService,
    createRemoveCartItemService,
    createUpdateCartItemService,
} from "../services/index.js";

function createAvailableCatalogRead(variantId, overrides = {}) {
    return {
        variantId,
        variantExists: true,
        variantIsDeleted: false,
        variantStatus: "active",
        productExists: true,
        productIsDeleted: false,
        productStatus: "active",
        productId: "65f000000000000000001001",
        productTitle: "Product 1",
        variantAttributes: {
            color: "Black",
            ram: "8GB",
            rom: "128GB",
        },
        salePrice: 100,
        currency: "VND",
        thumbnailUrl: "https://img.local/1.jpg",
        ...overrides,
    };
}

function createInventoryRead(variantId, overrides = {}) {
    return {
        variantId,
        stockQuantity: 5,
        isInStock: true,
        ...overrides,
    };
}

describe("cart services", () => {
    it("addCartItem creates cart and returns selected item summary", async () => {
        const variantId = "65f000000000000000000111";
        const cartRepository = {
            findCartByOwner: vi.fn().mockResolvedValue(null),
            createCart: vi.fn().mockResolvedValue(undefined),
            updateCartById: vi.fn().mockResolvedValue(undefined),
        };
        const catalogAdapter = {
            readVariantsForCart: vi
                .fn()
                .mockResolvedValue([createAvailableCatalogRead(variantId)]),
        };
        const inventoryAdapter = {
            readInventoryByVariantIds: vi
                .fn()
                .mockResolvedValue([createInventoryRead(variantId)]),
        };
        const service = createAddCartItemService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
        });

        const result = await service({
            owner: {
                ownerType: "guest",
                ownerKey: "guest-1",
            },
            input: {
                variantId,
                quantity: 2,
            },
        });

        expect(cartRepository.createCart).toHaveBeenCalledTimes(1);
        expect(result.item.variantId).toBe(variantId);
        expect(result.summary).toMatchObject({
            totalQuantity: 2,
            selectedQuantity: 2,
            totalAmount: 200,
        });
    });

    it("addCartItem throws CART_QUANTITY_EXCEEDS_STOCK when requested quantity exceeds inventory", async () => {
        const variantId = "65f000000000000000000112";
        const service = createAddCartItemService({
            cartRepository: {
                findCartByOwner: vi.fn().mockResolvedValue(null),
                createCart: vi.fn(),
                updateCartById: vi.fn(),
            },
            catalogAdapter: {
                readVariantsForCart: vi
                    .fn()
                    .mockResolvedValue([createAvailableCatalogRead(variantId)]),
            },
            inventoryAdapter: {
                readInventoryByVariantIds: vi
                    .fn()
                    .mockResolvedValue([
                        createInventoryRead(variantId, {
                            stockQuantity: 1,
                            isInStock: true,
                        }),
                    ]),
            },
        });

        await expect(
            service({
                owner: {
                    ownerType: "guest",
                    ownerKey: "guest-2",
                },
                input: {
                    variantId,
                    quantity: 2,
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 409,
            code: "CART_QUANTITY_EXCEEDS_STOCK",
        });
    });

    it("updateCartItem throws CART_ITEM_NOT_FOUND when owner is missing", async () => {
        const service = createUpdateCartItemService({
            cartRepository: {
                findCartByOwner: vi.fn(),
                updateCartById: vi.fn(),
            },
            catalogAdapter: {
                readVariantsForCart: vi.fn(),
            },
            inventoryAdapter: {
                readInventoryByVariantIds: vi.fn(),
            },
        });

        await expect(
            service({
                owner: null,
                variantId: "65f000000000000000000113",
                input: {
                    quantity: 1,
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 404,
            code: "CART_ITEM_NOT_FOUND",
        });
    });

    it("removeCartItem returns removed=false and empty summary when owner is invalid", async () => {
        const service = createRemoveCartItemService({
            cartRepository: {
                findCartByOwner: vi.fn(),
                updateCartById: vi.fn(),
            },
            catalogAdapter: {
                readVariantsForCart: vi.fn(),
            },
            inventoryAdapter: {
                readInventoryByVariantIds: vi.fn(),
            },
        });

        const result = await service({
            owner: null,
            variantId: "65f000000000000000000114",
        });

        expect(result).toEqual({
            cartId: null,
            variantId: "65f000000000000000000114",
            removed: false,
            summary: {
                totalQuantity: 0,
                selectedQuantity: 0,
                totalAmount: 0,
            },
        });
    });

    it("mergeGuestCartToCustomer returns merged=false for invalid inputs", async () => {
        const cartRepository = {
            findCartByOwner: vi.fn(),
            updateCartById: vi.fn(),
        };
        const service = createMergeGuestCartToCustomerService({
            cartRepository,
        });

        const result = await service({
            guestId: "",
            customerAccountId: "acc-1",
        });

        expect(result).toEqual({
            merged: false,
        });
        expect(cartRepository.findCartByOwner).not.toHaveBeenCalled();
    });

    it("mergeGuestCartToCustomer migrates owner to customer when guest cart exists", async () => {
        const guestCartId = new ObjectId();
        const cartRepository = {
            findCartByOwner: vi.fn().mockResolvedValue({
                _id: guestCartId,
                ownerType: "guest",
                ownerKey: "guest-5",
                items: [],
            }),
            updateCartById: vi.fn().mockResolvedValue(undefined),
        };
        const service = createMergeGuestCartToCustomerService({
            cartRepository,
        });

        const result = await service({
            guestId: "guest-5",
            customerAccountId: "acc-5",
        });

        expect(cartRepository.updateCartById).toHaveBeenCalledWith(
            expect.objectContaining({
                cartId: guestCartId,
                cart: expect.objectContaining({
                    ownerType: "customer",
                    ownerKey: "acc-5",
                }),
            })
        );
        expect(result).toEqual({
            merged: true,
            cartId: guestCartId,
        });
    });

    it("getCart reconciles unavailable selected item to unselected and persists the update", async () => {
        const variantId = "65f000000000000000000115";
        const cartId = new ObjectId();
        const cartRepository = {
            findCartByOwner: vi.fn().mockResolvedValue({
                _id: cartId,
                ownerType: "guest",
                ownerKey: "guest-6",
                items: [
                    {
                        variantId: new ObjectId(variantId),
                        quantity: 1,
                        selected: true,
                        addedAt: new Date("2026-01-01T00:00:00.000Z"),
                    },
                ],
            }),
            updateCartById: vi.fn().mockResolvedValue(undefined),
        };
        const catalogAdapter = {
            readVariantsForCart: vi.fn().mockResolvedValue([
                createAvailableCatalogRead(variantId, {
                    variantStatus: "inactive",
                }),
            ]),
        };
        const inventoryAdapter = {
            readInventoryByVariantIds: vi
                .fn()
                .mockResolvedValue([createInventoryRead(variantId)]),
        };
        const service = createGetCartService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
        });

        const result = await service({
            owner: {
                ownerType: "guest",
                ownerKey: "guest-6",
            },
        });

        expect(cartRepository.updateCartById).toHaveBeenCalledTimes(1);
        expect(result.items[0]).toMatchObject({
            variantId,
            selected: false,
            isAvailable: false,
            availabilityStatus: "variant_inactive",
        });
        expect(result.summary.selectedQuantity).toBe(0);
    });

    it("clearCart returns empty cart summary for unknown owner", async () => {
        const service = createClearCartService({
            cartRepository: {
                findCartByOwner: vi.fn(),
                updateCartById: vi.fn(),
            },
        });

        const result = await service({
            owner: null,
        });

        expect(result).toEqual({
            cartId: null,
            cleared: true,
            summary: {
                totalQuantity: 0,
                selectedQuantity: 0,
                totalAmount: 0,
            },
        });
    });
});
