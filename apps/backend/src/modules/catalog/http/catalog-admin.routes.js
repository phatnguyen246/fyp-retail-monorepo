import express from "express";
import { createVariantImageUploadMiddleware } from "./catalog-admin.media-upload.js";

export function createCatalogAdminRouter({
    controller,
    uploadVariantImageMiddleware = createVariantImageUploadMiddleware(),
}) {
    const router = express.Router();

    router.post("/products", controller.createProduct);
    router.get("/products/:productId", controller.getProductDetailAdmin);
    router.patch("/products/:productId", controller.updateProduct);
    router.delete("/products/:productId", controller.softDeleteProduct);

    router.post("/products/:productId/variants", controller.createVariant);
    router.patch("/variants/:variantId", controller.updateVariant);
    router.delete("/variants/:variantId", controller.softDeleteVariant);
    router.post(
        "/variants/:variantId/images",
        uploadVariantImageMiddleware,
        controller.uploadVariantImage
    );
    router.get("/variants/:variantId/images", controller.listVariantImages);
    router.delete(
        "/variants/:variantId/images/:mediaId",
        controller.deleteVariantImage
    );

    return router;
}
