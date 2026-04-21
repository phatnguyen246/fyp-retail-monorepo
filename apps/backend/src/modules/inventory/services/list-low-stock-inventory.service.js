import { createInventoryRecordView } from "../utils/index.js";
import { buildPaginationMeta } from "../../catalog/services/catalog-storefront.service-helpers.js";
import { createInventoryValidation } from "../validation/index.js";

function createInventoryListFilter(query = {}) {
    const filter = {};

    if (query.stockState === "out") {
        filter.stockQuantity = 0;
    } else if (query.stockState === "low") {
        filter.stockQuantity = { $gt: 0 };
        filter.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    } else {
        // Default: only records at or below threshold
        filter.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    }

    return filter;
}

function createInventoryListSort(query = {}) {
    const direction = query.sortOrder === "asc" ? 1 : -1;

    return {
        [query.sortBy]: direction,
        _id: direction,
    };
}

export function createListLowStockInventoryService({
    inventoryRepository,
    catalogAdapter,
    validation = createInventoryValidation(),
    logger = console,
} = {}) {
    return async function listLowStockInventory({ query } = {}) {
        const parsedQuery = validation.parseAdminListLowStockQuery(query ?? {});
        const filter = createInventoryListFilter(parsedQuery);
        const sort = createInventoryListSort(parsedQuery);

        // If searching, we need to find matching variant IDs from catalog first
        if (parsedQuery.q && parsedQuery.q.trim().length > 0) {
            try {
                const matchingVariants = await catalogAdapter.searchVariantsByKeyword({
                    q: parsedQuery.q.trim(),
                });
                const variantIds = matchingVariants.map(v => v._id);
                
                if (variantIds.length === 0) {
                    return { data: [], meta: buildPaginationMeta({ page: parsedQuery.page, limit: parsedQuery.limit, total: 0 }) };
                }
                
                filter.variantId = { $in: variantIds };
            } catch (error) {
                logger.warn("Inventory search catalog lookup failed", { error });
            }
        }

        const skip = (parsedQuery.page - 1) * parsedQuery.limit;

        const [inventoryRecords, total] = await Promise.all([
            inventoryRepository.findInventoryRecordsByFilter({
                filter,
                sort,
                skip,
                limit: parsedQuery.limit,
            }),
            inventoryRepository.countInventoryRecordsByFilter({
                filter,
            }),
        ]);

        const inventoryViews = inventoryRecords.map((inventoryRecord) =>
            createInventoryRecordView(inventoryRecord)
        );

        if (
            !catalogAdapter ||
            typeof catalogAdapter.findCatalogDisplayByVariantIds !== "function" ||
            inventoryViews.length === 0
        ) {
            return {
                data: inventoryViews,
                meta: buildPaginationMeta({ page: parsedQuery.page, limit: parsedQuery.limit, total }),
            };
        }

        const variantIds = inventoryViews
            .map((view) => view.variantId)
            .filter((variantId) => typeof variantId === "string" && variantId.length > 0);

        try {
            const catalogDisplays =
                await catalogAdapter.findCatalogDisplayByVariantIds({
                    variantIds,
                });
            const catalogDisplayMap = new Map(
                catalogDisplays.map((display) => [display.variantId, display])
            );

            return {
                data: inventoryViews.map((view) => {
                    const display = catalogDisplayMap.get(view.variantId);

                    return {
                        ...view,
                        productName: display?.productName ?? null,
                        productGroupCode: display?.productGroupCode ?? null,
                        sku: display?.sku ?? null,
                        variantLabel: display?.variantLabel ?? null,
                    };
                }),
                meta: buildPaginationMeta({
                    page: parsedQuery.page,
                    limit: parsedQuery.limit,
                    total,
                }),
            };
        } catch (error) {
            logger.warn("Inventory low-stock catalog hydration failed", {
                error:
                    error instanceof Error ? error.message : String(error),
            });

            return {
                data: inventoryViews,
                meta: buildPaginationMeta({
                    page: parsedQuery.page,
                    limit: parsedQuery.limit,
                    total,
                }),
            };
        }
    };
}
