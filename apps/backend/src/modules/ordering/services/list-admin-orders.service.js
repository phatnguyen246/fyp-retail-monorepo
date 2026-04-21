import { createOrderSummaryView } from "../utils/index.js";
import { buildPaginationMeta } from "../../catalog/services/catalog-storefront.service-helpers.js";
import { createOrderingValidation } from "../validation/index.js";

function createAdminOrderListFilter(query = {}) {
    const filter = {};

    if (query.status && query.status !== "all") {
        filter.orderStatus = query.status;
    }

    if (query.paymentMethod && query.paymentMethod !== "all") {
        filter.paymentMethod = query.paymentMethod;
    }

    if (query.paymentStatus && query.paymentStatus !== "all") {
        filter.paymentStatus = query.paymentStatus;
    }

    if (query.q && typeof query.q === "string" && query.q.trim().length > 0) {
        const searchRegex = new RegExp(query.q.trim(), "i");
        filter.$or = [
            { orderCode: searchRegex },
            { recipientName: searchRegex },
            { phoneNumber: searchRegex },
        ];
    }

    return filter;
}

function createAdminOrderListSort(query = {}) {
    const direction = query.sortOrder === "asc" ? 1 : -1;

    return {
        [query.sortBy]: direction,
        _id: direction,
    };
}

export function createListAdminOrdersService({ 
    orderRepository,
    validation = createOrderingValidation()
} = {}) {
    return async function listAdminOrders({ query } = {}) {
        const parsedQuery = validation.parseAdminListOrdersQuery(query ?? {});
        const filter = createAdminOrderListFilter(parsedQuery);
        const sort = createAdminOrderListSort(parsedQuery);
        const skip = (parsedQuery.page - 1) * parsedQuery.limit;

        const [orders, total] = await Promise.all([
            orderRepository.findOrdersByFilter({
                filter,
                sort,
                skip,
                limit: parsedQuery.limit,
            }),
            orderRepository.countOrdersByFilter({
                filter,
            }),
        ]);

        return {
            data: orders.map((order) => createOrderSummaryView(order)),
            meta: buildPaginationMeta({
                page: parsedQuery.page,
                limit: parsedQuery.limit,
                total,
            }),
        };
    };
}
