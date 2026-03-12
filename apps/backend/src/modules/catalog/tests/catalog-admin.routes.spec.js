import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGlobalErrorHandler } from "../../../bootstrap/error-handler.js";
import {
    CATALOG_VARIANT_IMAGE_FORM_FIELD,
    CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
} from "../constants/index.js";
import { createCatalogAdminRouter } from "../http/catalog-admin.routes.js";

async function startServer(controller) {
    const app = express();
    const logger = { error: vi.fn() };

    app.use(createCatalogAdminRouter({ controller }));
    app.use(createGlobalErrorHandler({ logger }));

    const server = await new Promise((resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
    });

    const { port } = server.address();

    return {
        logger,
        server,
        url: `http://127.0.0.1:${port}`,
    };
}

describe("catalog admin routes", () => {
    let runningServer;

    afterEach(async () => {
        if (!runningServer?.server) {
            return;
        }

        await new Promise((resolve, reject) => {
            runningServer.server.close((error) => {
                if (error) {
                    reject(error);

                    return;
                }

                resolve();
            });
        });
        runningServer = null;
    });

    it("parses a single multipart image file for the upload route", async () => {
        const controller = {
            createProduct: vi.fn(),
            getProductDetailAdmin: vi.fn(),
            updateProduct: vi.fn(),
            softDeleteProduct: vi.fn(),
            createVariant: vi.fn(),
            updateVariant: vi.fn(),
            softDeleteVariant: vi.fn(),
            listVariantImages: vi.fn(),
            deleteVariantImage: vi.fn(),
            uploadVariantImage: vi.fn((req, res) => {
                return res.status(201).json({
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                });
            }),
        };
        const formData = new FormData();

        formData.set(
            CATALOG_VARIANT_IMAGE_FORM_FIELD,
            new Blob([Buffer.from("png-binary")], {
                type: "image/png",
            }),
            "front.png"
        );

        runningServer = await startServer(controller);

        const response = await fetch(
            `${runningServer.url}/variants/65f000000000000000000007/images`,
            {
                method: "POST",
                body: formData,
            }
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body).toEqual({
            fieldname: "image",
            originalname: "front.png",
            mimetype: "image/png",
            size: 10,
        });
        expect(controller.uploadVariantImage).toHaveBeenCalledTimes(1);
    });

    it("rejects unsupported image formats with HTTP 422 before reaching the controller", async () => {
        const controller = {
            createProduct: vi.fn(),
            getProductDetailAdmin: vi.fn(),
            updateProduct: vi.fn(),
            softDeleteProduct: vi.fn(),
            createVariant: vi.fn(),
            updateVariant: vi.fn(),
            softDeleteVariant: vi.fn(),
            listVariantImages: vi.fn(),
            deleteVariantImage: vi.fn(),
            uploadVariantImage: vi.fn(),
        };
        const formData = new FormData();

        formData.set(
            CATALOG_VARIANT_IMAGE_FORM_FIELD,
            new Blob([Buffer.from("gif-binary")], {
                type: "image/gif",
            }),
            "front.gif"
        );

        runningServer = await startServer(controller);

        const response = await fetch(
            `${runningServer.url}/variants/65f000000000000000000007/images`,
            {
                method: "POST",
                body: formData,
            }
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("CATALOG_UNPROCESSABLE_ENTITY");
        expect(controller.uploadVariantImage).not.toHaveBeenCalled();
    });

    it("maps multer file-size errors to HTTP 422", async () => {
        const controller = {
            createProduct: vi.fn(),
            getProductDetailAdmin: vi.fn(),
            updateProduct: vi.fn(),
            softDeleteProduct: vi.fn(),
            createVariant: vi.fn(),
            updateVariant: vi.fn(),
            softDeleteVariant: vi.fn(),
            listVariantImages: vi.fn(),
            deleteVariantImage: vi.fn(),
            uploadVariantImage: vi.fn(),
        };
        const formData = new FormData();

        formData.set(
            CATALOG_VARIANT_IMAGE_FORM_FIELD,
            new Blob([Buffer.alloc(CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES + 1)], {
                type: "image/png",
            }),
            "oversized.png"
        );

        runningServer = await startServer(controller);

        const response = await fetch(
            `${runningServer.url}/variants/65f000000000000000000007/images`,
            {
                method: "POST",
                body: formData,
            }
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("CATALOG_UNPROCESSABLE_ENTITY");
        expect(controller.uploadVariantImage).not.toHaveBeenCalled();
    });

    it("rejects multipart requests without an image file", async () => {
        const controller = {
            createProduct: vi.fn(),
            getProductDetailAdmin: vi.fn(),
            updateProduct: vi.fn(),
            softDeleteProduct: vi.fn(),
            createVariant: vi.fn(),
            updateVariant: vi.fn(),
            softDeleteVariant: vi.fn(),
            listVariantImages: vi.fn(),
            deleteVariantImage: vi.fn(),
            uploadVariantImage: vi.fn(),
        };
        const formData = new FormData();

        runningServer = await startServer(controller);

        const response = await fetch(
            `${runningServer.url}/variants/65f000000000000000000007/images`,
            {
                method: "POST",
                body: formData,
            }
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("CATALOG_UNPROCESSABLE_ENTITY");
        expect(body.message).toBe(
            "Catalog variant image upload requires an image file"
        );
        expect(controller.uploadVariantImage).not.toHaveBeenCalled();
    });

    it("rejects malformed upload requests with an unexpected file field", async () => {
        const controller = {
            createProduct: vi.fn(),
            getProductDetailAdmin: vi.fn(),
            updateProduct: vi.fn(),
            softDeleteProduct: vi.fn(),
            createVariant: vi.fn(),
            updateVariant: vi.fn(),
            softDeleteVariant: vi.fn(),
            listVariantImages: vi.fn(),
            deleteVariantImage: vi.fn(),
            uploadVariantImage: vi.fn(),
        };
        const formData = new FormData();

        formData.set(
            "unexpected",
            new Blob([Buffer.from("png-binary")], {
                type: "image/png",
            }),
            "front.png"
        );

        runningServer = await startServer(controller);

        const response = await fetch(
            `${runningServer.url}/variants/65f000000000000000000007/images`,
            {
                method: "POST",
                body: formData,
            }
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("CATALOG_UNPROCESSABLE_ENTITY");
        expect(body.message).toBe("Catalog variant image upload request is invalid");
        expect(controller.uploadVariantImage).not.toHaveBeenCalled();
    });
});
