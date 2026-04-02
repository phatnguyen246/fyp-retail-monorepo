import { createCatalogPersistence } from "../../catalog/adapters/persistence/index.js";
import { createInventoryPersistence } from "../../inventory/adapters/persistence/index.js";
import { createOrderingPersistence } from "../../ordering/adapters/persistence/index.js";
import { createGetAdminOverviewService } from "./get-admin-overview.service.js";

export { createGetAdminOverviewService } from "./get-admin-overview.service.js";

export function createAdminOverviewServices({ db } = {}) {
    const catalogPersistence = createCatalogPersistence({ db });
    const orderingPersistence = createOrderingPersistence({ db });
    const inventoryPersistence = createInventoryPersistence({ db });

    return {
        getAdminOverview: createGetAdminOverviewService({
            productRepository: catalogPersistence.productRepository,
            variantRepository: catalogPersistence.variantRepository,
            orderRepository: orderingPersistence.orderRepository,
            inventoryRepository: inventoryPersistence.inventoryRepository,
        }),
    };
}
