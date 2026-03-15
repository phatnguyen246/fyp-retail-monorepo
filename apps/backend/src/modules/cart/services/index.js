import { createCartAdapters } from "../adapters/index.js";
import { createCartHealthPayload } from "../utils/index.js";
import { createCartValidation } from "../validation/index.js";
import { createAddCartItemService } from "./add-cart-item.service.js";
import { createClearCartService } from "./clear-cart.service.js";
import { createGetCartService } from "./get-cart.service.js";
import { createRemoveCartItemService } from "./remove-cart-item.service.js";
import { createUpdateCartItemService } from "./update-cart-item.service.js";

export { createAddCartItemService } from "./add-cart-item.service.js";
export { createClearCartService } from "./clear-cart.service.js";
export { createGetCartService } from "./get-cart.service.js";
export { createRemoveCartItemService } from "./remove-cart-item.service.js";
export { createUpdateCartItemService } from "./update-cart-item.service.js";

export function createCartServices({
    adapters = createCartAdapters(),
    validation = createCartValidation(),
} = {}) {
    const cartRepository = adapters?.persistence?.cartRepository;
    const catalogAdapter = adapters?.catalog;
    const inventoryAdapter = adapters?.inventory;

    return {
        getHealth() {
            return createCartHealthPayload();
        },
        getCart: createGetCartService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
        }),
        addCartItem: createAddCartItemService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
            validation,
        }),
        updateCartItem: createUpdateCartItemService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
            validation,
        }),
        removeCartItem: createRemoveCartItemService({
            cartRepository,
            catalogAdapter,
            inventoryAdapter,
            validation,
        }),
        clearCart: createClearCartService({
            cartRepository,
        }),
    };
}
