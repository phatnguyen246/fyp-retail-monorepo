import express from "express";

export function createCatalogRouter({ controller }) {
    const router = express.Router();

    router.get("/health", controller.getHealth);
    router.get("/products", controller.listProducts);
    router.get("/search", controller.searchProducts);
    router.get("/products/:productId", controller.getProductDetail);
    router.get("/products/:productId/:slug", controller.getProductDetail);
    router.post("/compare", controller.compareProducts);

    return router;
}
