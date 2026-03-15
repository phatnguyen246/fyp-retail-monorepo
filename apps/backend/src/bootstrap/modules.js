import { registerCatalogModule } from "../modules/catalog/index.js";
import { registerInventoryModule } from "../modules/inventory/index.js";
import { registerOrderingModule } from "../modules/ordering/api/register.js";

export function registerModules({ app, db, storage }) {
    registerCatalogModule({ app, db, storage });
    registerInventoryModule({ app, db });
    registerOrderingModule({ app, db });
}
