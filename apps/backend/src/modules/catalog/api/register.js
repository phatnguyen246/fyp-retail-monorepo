import { makeProductController } from "./product.controller.js";

/**
 * API Adapter for Catalog module
 * - Không biết Mongo
 * - Không biết repository implementation
 * - Chỉ nhận usecases đã được compose sẵn
 */
export function registerCatalogModule(app, { usecases }) {
    // Health check
    app.get("/catalog/health", (req, res) => res.json({ ok: true }));

    const controller = makeProductController({ usecases });

    // Command routes
    app.post("/catalog/products", controller.createProduct);
    app.post("/catalog/products/:id/variants", controller.addVariant);
    app.patch("/catalog/products/:id/status", controller.updateStatus);

    // Query routes
    app.get("/catalog/products", controller.listProducts);
    app.get("/catalog/products/:slug", controller.getBySlug);
    app.get("/catalog/admin/products/:id", controller.getById);
}
