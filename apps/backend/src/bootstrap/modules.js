// apps/backend/src/bootstrap/modules.js
import { registerCatalogModule } from "../modules/catalog/api/register.js";
import { registerOrderingModule } from "../modules/ordering/api/register.js";

import { makeProductRepositoryMongo } from "../modules/catalog/infrastructure/persistence/product.repository.mongo.js";
import { makeCatalogModule } from "../modules/catalog/index.js";

export function registerModules(app) {
    const productRepository = makeProductRepositoryMongo();
    const catalog = makeCatalogModule({productRepository} );

    registerCatalogModule(app, { usecases: catalog.usecases });
    registerOrderingModule(app);
}
