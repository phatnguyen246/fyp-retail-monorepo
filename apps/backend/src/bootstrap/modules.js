import { registerOrderingModule } from "../modules/ordering/api/register.js";

export function registerModules(app) {
    registerOrderingModule(app);
}
