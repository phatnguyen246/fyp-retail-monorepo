import { buildCatalogModule } from "../index.js";
import { makeProductController } from "./product.controller.js";

export function registerCatalogModule(app) {
    app.get("/catalog/health", (req, res) => res.json({ ok: true }));

    const catalog = buildCatalogModule();
    const controller = makeProductController({ usecases: catalog.usecases });

    app.post("/catalog/products", controller.createProduct);
    app.post("/catalog/products/:id/variants", controller.addVariant);
    // Query routes
    app.get("/catalog/products", controller.listProducts);
    app.get("/catalog/products/:slug", controller.getBySlug);
    app.get("/catalog/admin/products/:id", controller.getById);
}
