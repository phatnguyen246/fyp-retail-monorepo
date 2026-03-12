import express from "express";

export function createCatalogAdminRouter({ controller }) {
    const router = express.Router();

    router.post("/products", controller.createProduct);
    router.get("/products/:productId", controller.getProductDetailAdmin);
    router.patch("/products/:productId", controller.updateProduct);
    router.delete("/products/:productId", controller.softDeleteProduct);

    router.post("/products/:productId/variants", controller.createVariant);
    router.patch("/variants/:variantId", controller.updateVariant);
    router.delete("/variants/:variantId", controller.softDeleteVariant);

    return router;
}
