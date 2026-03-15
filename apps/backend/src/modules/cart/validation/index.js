import {
    ADD_CART_ITEM_INPUT_SCHEMA,
    parseAddCartItemInput,
} from "./add-cart-item.schema.js";
import {
    CART_ITEM_PARAMS_SCHEMA,
    parseCartItemParams,
} from "./cart-item-params.schema.js";
import { coerceIntegerInput, trimTextInput } from "./cart.normalizers.js";
import {
    parseUpdateCartItemInput,
    UPDATE_CART_ITEM_INPUT_SCHEMA,
} from "./update-cart-item.schema.js";

export {
    ADD_CART_ITEM_INPUT_SCHEMA,
    parseAddCartItemInput,
} from "./add-cart-item.schema.js";
export {
    CART_ITEM_PARAMS_SCHEMA,
    parseCartItemParams,
} from "./cart-item-params.schema.js";
export {
    parseUpdateCartItemInput,
    UPDATE_CART_ITEM_INPUT_SCHEMA,
} from "./update-cart-item.schema.js";

export function createCartValidation() {
    return {
        addCartItemSchema: ADD_CART_ITEM_INPUT_SCHEMA,
        cartItemParamsSchema: CART_ITEM_PARAMS_SCHEMA,
        updateCartItemSchema: UPDATE_CART_ITEM_INPUT_SCHEMA,
        parseAddCartItemInput,
        parseCartItemParams,
        parseUpdateCartItemInput,
        normalizers: {
            coerceIntegerInput,
            trimTextInput,
        },
    };
}
