import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVariantMediaStorage } from "../adapters/index.js";

describe("catalog variant media storage adapter", () => {
    let bucket;
    let blob;
    let storage;

    beforeEach(() => {
        blob = {
            save: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        };
        bucket = {
            name: "catalog-assets",
            file: vi.fn().mockReturnValue(blob),
        };
        storage = createVariantMediaStorage({ bucket });
    });

    it("builds the required variant image storage path", () => {
        expect(
            storage.buildVariantImageStoragePath({
                productId: "p123",
                variantId: "v456",
                fileName: "image-01.webp",
            })
        ).toBe("catalog/products/p123/variants/v456/image-01.webp");
    });

    it("uploads a variant image and returns storage metadata", async () => {
        const file = {
            originalname: "front image.webp",
            mimetype: "image/webp",
            size: 245678,
            buffer: Buffer.from("image-binary"),
        };

        const result = await storage.uploadVariantImage(file, {
            productId: "p123",
            variantId: "v456",
        });

        expect(bucket.file).toHaveBeenCalledWith(
            "catalog/products/p123/variants/v456/front image.webp"
        );
        expect(blob.save).toHaveBeenCalledWith(file.buffer, {
            contentType: "image/webp",
        });
        expect(result).toEqual({
            storagePath: "catalog/products/p123/variants/v456/front image.webp",
            url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/front%20image.webp",
            fileName: "front image.webp",
            mimeType: "image/webp",
            size: 245678,
        });
    });

    it("deletes a variant image by storage path", async () => {
        await storage.deleteVariantImage(
            "catalog/products/p123/variants/v456/front.webp"
        );

        expect(bucket.file).toHaveBeenCalledWith(
            "catalog/products/p123/variants/v456/front.webp"
        );
        expect(blob.delete).toHaveBeenCalledTimes(1);
    });

    it("rethrows upload failures", async () => {
        const uploadError = new Error("upload failed");
        blob.save.mockRejectedValueOnce(uploadError);

        await expect(
            storage.uploadVariantImage(
                {
                    originalname: "front.webp",
                    mimetype: "image/webp",
                    size: 2048,
                    buffer: Buffer.from("image-binary"),
                },
                {
                    productId: "p123",
                    variantId: "v456",
                }
            )
        ).rejects.toThrow("upload failed");
    });

    it("rethrows delete failures", async () => {
        const deleteError = new Error("delete failed");
        blob.delete.mockRejectedValueOnce(deleteError);

        await expect(
            storage.deleteVariantImage(
                "catalog/products/p123/variants/v456/front.webp"
            )
        ).rejects.toThrow("delete failed");
    });
});
