import { buildCatalogModule } from "../index.js";
import { makeProductController } from "./product.controller.js";

export function registerCatalogModule(app) {
    app.get("/catalog/health", (req, res) => res.json({ ok: true }));

    const catalog = buildCatalogModule();
    const controller = makeProductController({ usecases: catalog.usecases });

    app.post("/catalog/products", controller.createProduct);
    app.post("/catalog/products/:id/variants", controller.addVariant);
}
