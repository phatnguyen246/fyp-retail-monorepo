// apps/backend/src/bootstrap/modules.js
import { registerCatalogModule } from "../modules/catalog/api/register.js";
import { registerOrderingModule } from "../modules/ordering/api/register.js";

export function registerModules(app) {
    registerCatalogModule(app);
    registerOrderingModule(app);
}
