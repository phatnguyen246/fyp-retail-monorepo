import {
    CART_DOCUMENT_SHAPE,
    CART_ITEM_DOCUMENT_SHAPE,
    createCart,
    createCartItem,
} from "./cart.model.js";

export {
    CART_DOCUMENT_SHAPE,
    CART_ITEM_DOCUMENT_SHAPE,
    createCart,
    createCartItem,
} from "./cart.model.js";

export function createCartModels() {
    return {
        Cart: CART_DOCUMENT_SHAPE,
        CartItem: CART_ITEM_DOCUMENT_SHAPE,
        createCart,
        createCartItem,
    };
}
