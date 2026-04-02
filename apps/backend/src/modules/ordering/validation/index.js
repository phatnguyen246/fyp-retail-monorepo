import {
    CREATE_ORDER_INPUT_SCHEMA,
    parseCreateOrderInput,
} from "./create-order.schema.js";
import {
    GUEST_ORDER_LOOKUP_INPUT_SCHEMA,
    parseGuestOrderLookupInput,
} from "./guest-order-lookup.schema.js";
import { ORDER_ID_PARAMS_SCHEMA, parseOrderIdParams } from "./order-resource-params.schema.js";
import { trimTextInput } from "./ordering.normalizers.js";
import {
    parseUpdateOrderStatusInput,
    UPDATE_ORDER_STATUS_INPUT_SCHEMA,
} from "./update-order-status.schema.js";

export {
    CREATE_ORDER_INPUT_SCHEMA,
    parseCreateOrderInput,
} from "./create-order.schema.js";
export {
    GUEST_ORDER_LOOKUP_INPUT_SCHEMA,
    parseGuestOrderLookupInput,
} from "./guest-order-lookup.schema.js";
export { ORDER_ID_PARAMS_SCHEMA, parseOrderIdParams } from "./order-resource-params.schema.js";
export {
    parseUpdateOrderStatusInput,
    UPDATE_ORDER_STATUS_INPUT_SCHEMA,
} from "./update-order-status.schema.js";

export function createOrderingValidation() {
    return {
        createOrderInputSchema: CREATE_ORDER_INPUT_SCHEMA,
        guestOrderLookupInputSchema: GUEST_ORDER_LOOKUP_INPUT_SCHEMA,
        orderIdParamsSchema: ORDER_ID_PARAMS_SCHEMA,
        updateOrderStatusInputSchema: UPDATE_ORDER_STATUS_INPUT_SCHEMA,
        parseCreateOrderInput,
        parseGuestOrderLookupInput,
        parseOrderIdParams,
        parseUpdateOrderStatusInput,
        normalizers: {
            trimTextInput,
        },
    };
}
