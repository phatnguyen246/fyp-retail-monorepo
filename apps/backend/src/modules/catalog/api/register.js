import { makeProductController } from "./controllers/product.controller.js";
import { makeFilterDefsController } from "./controllers/filterDefs.controller.js";
import { makeFacetsController } from "./controllers/facets.controller.js";

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
    const filterDefsController = makeFilterDefsController({ usecases });
    const facetsController = makeFacetsController({ usecases });

    // Command routes
    app.post("/catalog/products", controller.createProduct);
    app.post("/catalog/products/:id/variants", controller.addVariant);
    app.patch("/catalog/products/:id/status", controller.updateStatus);

    // Query routes
    // GET /catalog/products?status=&product_type=&q=&limit=&cursor=&sort_field=&sort_dir=
    app.get("/catalog/products", controller.listProducts);
    app.get("/catalog/products/:slug", controller.getBySlug);
    app.get("/catalog/admin/products/:id", controller.getById);

    // Filter defs + facets
    app.get("/catalog/filter-defs", filterDefsController.getFilterDefs);
    app.get("/catalog/products/facets", facetsController.getProductFacets);
}
