import { createOrderDetailView } from "../utils/index.js";
import { createOrderForbiddenError, createOrderNotFoundError } from "./ordering-service.errors.js";
import { createOrderRequester } from "./ordering-service.helpers.js";

export function createLookupGuestOrderService({
    orderRepository,
    validation,
} = {}) {
    return async function lookupGuestOrder({ input, requester } = {}) {
        const normalizedRequester = createOrderRequester(requester);

        if (normalizedRequester.role === "admin") {
            throw createOrderForbiddenError("Admin accounts must use admin order routes");
        }

        const parsedInput = validation.parseGuestOrderLookupInput(input);
        const order = await orderRepository.findOrderByFilter({
            filter: {
                accountId: null,
                orderCode: parsedInput.orderCode,
            },
        });

        if (!order) {
            throw createOrderNotFoundError("Guest order not found", {
                orderCode: parsedInput.orderCode,
            });
        }

        return createOrderDetailView(order);
    };
}
