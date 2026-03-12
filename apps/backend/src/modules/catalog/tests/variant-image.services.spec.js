import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createCatalogValidation } from "../validation/index.js";
import { createDeleteVariantImageService } from "../services/delete-variant-image.service.js";
import { createListVariantImagesService } from "../services/list-variant-images.service.js";
import { createUploadVariantImageService } from "../services/upload-variant-image.service.js";
import {
    createProductFixture,
    createProductMediaFixture,
    createVariantFixture,
} from "./fixtures/index.js";

function createUploadFile(overrides = {}) {
    return {
        fieldname: "image",
        originalname: "front.png",
        mimetype: "image/png",
        size: 1024,
        buffer: Buffer.from("variant-image"),
        ...overrides,
    };
}

function createImageArray(count) {
    return Array.from({ length: count }, (_value, index) =>
        createProductMediaFixture({
            _id: new ObjectId(`65f0000000000000000000${(90 + index)
                .toString()
                .padStart(2, "0")}`),
            sortOrder: index,
            storagePath: `catalog/products/p123/variants/v456/${index}.webp`,
            fileName: `${index}.webp`,
            url: `https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/${index}.webp`,
        })
    );
}

describe("variant image services", () => {
    it("uploads a variant image, creates metadata, and links the media reference", async () => {
        const variant = createVariantFixture();
        const product = createProductFixture({
            _id: variant.productId,
            status: "active",
        });
        const existingMedia = [
            createProductMediaFixture({
                sortOrder: 2,
            }),
        ];
        const createdMedia = createProductMediaFixture({
            _id: new ObjectId("65f000000000000000000091"),
            productId: product._id,
            variantId: variant._id,
            mimeType: "image/png",
            fileName: "generated.png",
            storagePath: "catalog/products/p123/variants/v456/generated.png",
            url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/generated.png",
            sortOrder: 3,
        });
        const productRepository = {
            findProductById: vi.fn().mockResolvedValue(product),
        };
        const variantRepository = {
            findVariantById: vi.fn().mockResolvedValue(variant),
            addMediaId: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const mediaRepository = {
            listMediaByVariantId: vi.fn().mockResolvedValue(existingMedia),
            createMedia: vi.fn().mockResolvedValue({ acknowledged: true }),
            deleteMediaById: vi.fn().mockResolvedValue({ deletedCount: 1 }),
            findMediaById: vi.fn().mockResolvedValue(createdMedia),
        };
        const storage = {
            uploadVariantImage: vi.fn().mockResolvedValue({
                storagePath:
                    "catalog/products/p123/variants/v456/generated.png",
                url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/generated.png",
                fileName: "generated.png",
                mimeType: "image/png",
                size: 1024,
            }),
            deleteVariantImage: vi.fn().mockResolvedValue(undefined),
        };
        const uploadVariantImage = createUploadVariantImageService({
            productRepository,
            variantRepository,
            mediaRepository,
            storage,
            validation: createCatalogValidation(),
        });

        const result = await uploadVariantImage({
            variantId: variant._id.toHexString(),
            file: createUploadFile(),
        });

        expect(storage.uploadVariantImage).toHaveBeenCalledWith(
            expect.objectContaining({
                originalname: expect.stringMatching(
                    /^[0-9a-f-]{36}\.png$/i
                ),
            }),
            {
                productId: product._id.toHexString(),
                variantId: variant._id.toHexString(),
            }
        );
        expect(mediaRepository.createMedia).toHaveBeenCalledWith({
            document: expect.objectContaining({
                productId: product._id,
                variantId: variant._id,
                mimeType: "image/png",
                sortOrder: 3,
            }),
        });
        expect(variantRepository.addMediaId).toHaveBeenCalledWith({
            variantId: variant._id,
            mediaId: expect.any(ObjectId),
        });
        expect(result).toEqual(createdMedia);
    });

    it("rejects upload for unsupported image formats", async () => {
        const uploadVariantImage = createUploadVariantImageService({
            productRepository: {},
            variantRepository: {},
            mediaRepository: {},
            storage: {
                uploadVariantImage: vi.fn(),
                deleteVariantImage: vi.fn(),
            },
            validation: createCatalogValidation(),
        });

        await expect(
            uploadVariantImage({
                variantId: "65f000000000000000000007",
                file: createUploadFile({
                    mimetype: "image/gif",
                    originalname: "front.gif",
                }),
            })
        ).rejects.toMatchObject({
            httpStatus: 422,
        });
    });

    it("rejects upload when a variant already has 10 images", async () => {
        const variant = createVariantFixture();
        const product = createProductFixture({
            _id: variant.productId,
            status: "active",
        });
        const storage = {
            uploadVariantImage: vi.fn(),
            deleteVariantImage: vi.fn(),
        };
        const uploadVariantImage = createUploadVariantImageService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository: {
                findVariantById: vi.fn().mockResolvedValue(variant),
                addMediaId: vi.fn(),
            },
            mediaRepository: {
                listMediaByVariantId: vi.fn().mockResolvedValue(createImageArray(10)),
                createMedia: vi.fn(),
                deleteMediaById: vi.fn(),
                findMediaById: vi.fn(),
            },
            storage,
            validation: createCatalogValidation(),
        });

        await expect(
            uploadVariantImage({
                variantId: variant._id.toHexString(),
                file: createUploadFile(),
            })
        ).rejects.toMatchObject({
            httpStatus: 409,
        });
        expect(storage.uploadVariantImage).not.toHaveBeenCalled();
    });

    it("rolls back metadata and storage when linking the uploaded image fails", async () => {
        const variant = createVariantFixture();
        const product = createProductFixture({
            _id: variant.productId,
            status: "active",
        });
        const mediaRepository = {
            listMediaByVariantId: vi.fn().mockResolvedValue([]),
            createMedia: vi.fn().mockResolvedValue({ acknowledged: true }),
            deleteMediaById: vi.fn().mockResolvedValue({ deletedCount: 1 }),
            findMediaById: vi.fn(),
        };
        const storage = {
            uploadVariantImage: vi.fn().mockResolvedValue({
                storagePath: "catalog/products/p123/variants/v456/generated.png",
                url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/generated.png",
                fileName: "generated.png",
                mimeType: "image/png",
                size: 1024,
            }),
            deleteVariantImage: vi.fn().mockResolvedValue(undefined),
        };
        const uploadVariantImage = createUploadVariantImageService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository: {
                findVariantById: vi.fn().mockResolvedValue(variant),
                addMediaId: vi.fn().mockRejectedValue(new Error("link failed")),
            },
            mediaRepository,
            storage,
            validation: createCatalogValidation(),
        });

        await expect(
            uploadVariantImage({
                variantId: variant._id.toHexString(),
                file: createUploadFile(),
            })
        ).rejects.toThrow("link failed");
        expect(mediaRepository.deleteMediaById).toHaveBeenCalledWith({
            mediaId: expect.any(ObjectId),
        });
        expect(storage.deleteVariantImage).toHaveBeenCalledWith(
            "catalog/products/p123/variants/v456/generated.png"
        );
    });

    it("lists images for a variant", async () => {
        const variant = createVariantFixture({
            isDeleted: true,
        });
        const mediaList = [
            createProductMediaFixture({
                sortOrder: 0,
            }),
            createProductMediaFixture({
                _id: new ObjectId("65f000000000000000000091"),
                sortOrder: 1,
                fileName: "back.webp",
                storagePath: "catalog/products/p123/variants/v456/back.webp",
                url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/back.webp",
            }),
        ];
        const listVariantImages = createListVariantImagesService({
            variantRepository: {
                findVariantById: vi.fn().mockResolvedValue(variant),
            },
            mediaRepository: {
                listMediaByVariantId: vi.fn().mockResolvedValue(mediaList),
            },
            validation: createCatalogValidation(),
        });

        const result = await listVariantImages({
            variantId: variant._id.toHexString(),
        });

        expect(result).toEqual(mediaList);
    });

    it("deletes a variant image successfully", async () => {
        const variant = createVariantFixture();
        const product = createProductFixture({
            _id: variant.productId,
            status: "active",
        });
        const media = createProductMediaFixture({
            variantId: variant._id,
            productId: product._id,
        });
        const deleteVariantImage = createDeleteVariantImageService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository: {
                findVariantById: vi.fn().mockResolvedValue(variant),
                removeMediaId: vi.fn().mockResolvedValue({ acknowledged: true }),
                addMediaId: vi.fn().mockResolvedValue({ acknowledged: true }),
            },
            mediaRepository: {
                findMediaById: vi.fn().mockResolvedValue(media),
                deleteMediaById: vi.fn().mockResolvedValue({ deletedCount: 1 }),
                createMedia: vi.fn().mockResolvedValue({ acknowledged: true }),
            },
            storage: {
                uploadVariantImage: vi.fn(),
                deleteVariantImage: vi.fn().mockResolvedValue(undefined),
            },
            validation: createCatalogValidation(),
        });

        const result = await deleteVariantImage({
            variantId: variant._id.toHexString(),
            mediaId: media._id.toHexString(),
        });

        expect(result).toEqual(media);
    });

    it("restores metadata and variant linkage when Firebase deletion fails", async () => {
        const variant = createVariantFixture();
        const product = createProductFixture({
            _id: variant.productId,
            status: "active",
        });
        const media = createProductMediaFixture({
            variantId: variant._id,
            productId: product._id,
        });
        const variantRepository = {
            findVariantById: vi.fn().mockResolvedValue(variant),
            removeMediaId: vi.fn().mockResolvedValue({ acknowledged: true }),
            addMediaId: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const mediaRepository = {
            findMediaById: vi.fn().mockResolvedValue(media),
            deleteMediaById: vi.fn().mockResolvedValue({ deletedCount: 1 }),
            createMedia: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const deleteVariantImage = createDeleteVariantImageService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository,
            mediaRepository,
            storage: {
                uploadVariantImage: vi.fn(),
                deleteVariantImage: vi
                    .fn()
                    .mockRejectedValue(new Error("firebase delete failed")),
            },
            validation: createCatalogValidation(),
        });

        await expect(
            deleteVariantImage({
                variantId: variant._id.toHexString(),
                mediaId: media._id.toHexString(),
            })
        ).rejects.toThrow("firebase delete failed");
        expect(mediaRepository.createMedia).toHaveBeenCalledWith({
            document: media,
        });
        expect(variantRepository.addMediaId).toHaveBeenCalledWith({
            variantId: variant._id,
            mediaId: media._id,
        });
    });
});
