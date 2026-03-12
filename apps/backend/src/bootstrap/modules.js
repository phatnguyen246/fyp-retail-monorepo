import { registerCatalogModule } from "../modules/catalog/index.js";
import { registerOrderingModule } from "../modules/ordering/api/register.js";

export function registerModules({ app, db }) {
    registerCatalogModule({ app, db });
    registerOrderingModule({ app, db });
}
