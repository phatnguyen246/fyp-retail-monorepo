import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createCatalogValidation } from "../validation/index.js";
import { createCreateProductService } from "../services/create-product.service.js";
import { createCreateVariantService } from "../services/create-variant.service.js";
import { createGetProductDetailAdminService } from "../services/get-product-detail-admin.service.js";
import { createSoftDeleteProductService } from "../services/soft-delete-product.service.js";
import { createSoftDeleteVariantService } from "../services/soft-delete-variant.service.js";
import { createUpdateProductService } from "../services/update-product.service.js";
import { createUpdateVariantService } from "../services/update-variant.service.js";
import {
    createBrandFixture,
    createCategoryFixture,
    createProductFixture,
    createTagFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("catalog admin services", () => {
    it("creates a product draft with resolved references", async () => {
        const brand = createBrandFixture();
        const category = createCategoryFixture();
        const tag = createTagFixture();
        const productRepository = {
            findProductByProductGroupCode: vi.fn().mockResolvedValue(null),
            createProduct: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const referenceRepository = {
            findBrandByCode: vi.fn().mockResolvedValue(brand),
            findCategoryByCode: vi.fn().mockResolvedValue(category),
            findTagsByCodes: vi.fn().mockResolvedValue([tag]),
        };
        const createProductService = createCreateProductService({
            productRepository,
            referenceRepository,
            validation: createCatalogValidation(),
        });

        const product = await createProductService({
            input: {
                productGroupCode: " apple_iphone_17 ",
                title: "  iPhone 17  ",
                brandCode: " apple ",
                categoryCode: " smartphone ",
                tagCodes: ["camera-phone"],
                badges: ["NEW"],
                specs: {
                    chipset: "A19",
                },
            },
            actorId: " admin-1 ",
        });

        expect(product).toMatchObject({
            productGroupCode: "APPLE_IPHONE_17",
            title: "iPhone 17",
            slug: "iphone-17",
            searchTitle: "iphone 17",
            status: "draft",
            createdBy: "admin-1",
            updatedBy: "admin-1",
            brandId: brand._id,
            categoryId: category._id,
            tagIds: [tag._id],
        });
        expect(productRepository.createProduct).toHaveBeenCalledWith({
            document: expect.objectContaining({
                productGroupCode: "APPLE_IPHONE_17",
                title: "iPhone 17",
            }),
        });
    });

    it("rejects duplicate productGroupCode before create", async () => {
        const productRepository = {
            findProductByProductGroupCode: vi
                .fn()
                .mockResolvedValue(createProductFixture()),
            createProduct: vi.fn(),
        };
        const createProductService = createCreateProductService({
            productRepository,
            referenceRepository: {},
            validation: createCatalogValidation(),
        });

        await expect(
            createProductService({
                input: {
                    productGroupCode: "APPLE_IPHONE_16",
                    title: "iPhone 16",
                    brandCode: "APPLE",
                    categoryCode: "SMARTPHONE",
                    specs: {},
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 409,
        });
        expect(productRepository.createProduct).not.toHaveBeenCalled();
    });

    it("updates product core fields, refreshes searchTitle, and rebuilds derived fields on title change", async () => {
        const currentProduct = createProductFixture();
        const updatedProduct = createProductFixture({
            title: "iPhone 16 Pro",
            searchTitle: "iphone 16 pro",
        });
        const productRepository = {
            findProductById: vi
                .fn()
                .mockResolvedValueOnce(currentProduct)
                .mockResolvedValueOnce(updatedProduct),
            updateProductCoreFields: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const rebuildProductDerivedFields = vi.fn().mockResolvedValue(undefined);
        const updateProductService = createUpdateProductService({
            productRepository,
            referenceRepository: {
                findBrandByCode: vi.fn(),
                findCategoryByCode: vi.fn(),
                findTagsByCodes: vi.fn(),
            },
            validation: createCatalogValidation(),
            rebuildProductDerivedFields,
        });

        const product = await updateProductService({
            productId: currentProduct._id.toHexString(),
            input: {
                title: "  iPhone 16 Pro  ",
            },
            actorId: "admin-2",
        });

        expect(productRepository.updateProductCoreFields).toHaveBeenCalledWith({
            productId: currentProduct._id.toHexString(),
            coreFields: expect.objectContaining({
                title: "iPhone 16 Pro",
                searchTitle: "iphone 16 pro",
                updatedBy: "admin-2",
            }),
        });
        expect(product).toMatchObject({
            title: "iPhone 16 Pro",
            searchTitle: "iphone 16 pro",
        });
        expect(rebuildProductDerivedFields).toHaveBeenCalledWith({
            productId: currentProduct._id.toHexString(),
        });
    });

    it("creates a variant for an allowed parent product and rebuilds product derived fields", async () => {
        const product = createProductFixture({
            status: "active",
        });
        const createdVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000099"),
            productId: product._id,
            sku: "IP17-BLK-256",
            variantAttributes: {
                ram: "12GB",
                rom: "256GB",
                color: "Black",
            },
        });
        const variantRepository = {
            findVariantBySku: vi.fn().mockResolvedValue(null),
            createVariant: vi.fn().mockResolvedValue({ acknowledged: true }),
            findVariantById: vi.fn().mockResolvedValue(createdVariant),
        };
        const rebuildProductDerivedFields = vi.fn().mockResolvedValue(undefined);
        const createVariantService = createCreateVariantService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields,
        });

        const variant = await createVariantService({
            productId: product._id.toHexString(),
            input: {
                sku: "ip17-blk-256",
                variantAttributes: {
                    ram: "12GB",
                    rom: "256GB",
                    color: "Black",
                },
                originalPrice: 30990000,
                salePrice: 29990000,
            },
        });

        expect(variantRepository.createVariant).toHaveBeenCalledWith({
            document: expect.objectContaining({
                productId: product._id,
                sku: "IP17-BLK-256",
            }),
        });
        expect(rebuildProductDerivedFields).toHaveBeenCalledWith({
            productId: product._id,
        });
        expect(variant.sku).toBe("IP17-BLK-256");
    });

    it("rejects duplicate sku on create variant", async () => {
        const product = createProductFixture();
        const variantRepository = {
            findVariantBySku: vi.fn().mockResolvedValue(createVariantFixture()),
            createVariant: vi.fn(),
            findVariantById: vi.fn(),
        };
        const createVariantService = createCreateVariantService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields: vi.fn(),
        });

        await expect(
            createVariantService({
                productId: product._id.toHexString(),
                input: {
                    sku: "IP16-BLK-128",
                    variantAttributes: {
                        ram: "8GB",
                        rom: "128GB",
                        color: "Black",
                    },
                    originalPrice: 24990000,
                    salePrice: 22990000,
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 409,
        });
        expect(variantRepository.createVariant).not.toHaveBeenCalled();
    });

    it("rejects create variant when parent product is discontinued", async () => {
        const product = createProductFixture({
            status: "discontinued",
        });
        const createVariantService = createCreateVariantService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository: {
                findVariantBySku: vi.fn(),
                createVariant: vi.fn(),
                findVariantById: vi.fn(),
            },
            validation: createCatalogValidation(),
            rebuildProductDerivedFields: vi.fn(),
        });

        await expect(
            createVariantService({
                productId: product._id.toHexString(),
                input: {
                    sku: "IP16-PNK-256",
                    variantAttributes: {
                        ram: "8GB",
                        rom: "256GB",
                        color: "Pink",
                    },
                    originalPrice: 25990000,
                    salePrice: 24990000,
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 409,
        });
    });

    it("updates variant writable fields and rebuilds parent product derived fields", async () => {
        const currentVariant = createVariantFixture();
        const updatedVariant = createVariantFixture({
            salePrice: 21990000,
            variantAttributes: {
                ...currentVariant.variantAttributes,
                color: "Blue",
            },
        });
        const product = createProductFixture({
            _id: currentVariant.productId,
        });
        const variantRepository = {
            findVariantById: vi
                .fn()
                .mockResolvedValueOnce(currentVariant)
                .mockResolvedValueOnce(updatedVariant),
            updateVariantCoreFields: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const rebuildProductDerivedFields = vi.fn().mockResolvedValue(undefined);
        const updateVariantService = createUpdateVariantService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields,
        });

        const variant = await updateVariantService({
            variantId: currentVariant._id.toHexString(),
            input: {
                variantAttributes: {
                    color: "Blue",
                },
                salePrice: 21990000,
            },
        });

        expect(variantRepository.updateVariantCoreFields).toHaveBeenCalledWith({
            variantId: currentVariant._id.toHexString(),
            coreFields: expect.objectContaining({
                salePrice: 21990000,
                variantAttributes: {
                    ram: "8GB",
                    rom: "128GB",
                    color: "Blue",
                },
            }),
        });
        expect(rebuildProductDerivedFields).toHaveBeenCalledWith({
            productId: product._id,
        });
        expect(variant.salePrice).toBe(21990000);
    });

    it("rejects update variant when merged pricing violates the pricing invariant", async () => {
        const currentVariant = createVariantFixture({
            originalPrice: 24990000,
            salePrice: 22990000,
        });
        const product = createProductFixture({
            _id: currentVariant.productId,
        });
        const variantRepository = {
            findVariantById: vi.fn().mockResolvedValue(currentVariant),
            updateVariantCoreFields: vi.fn(),
        };
        const updateVariantService = createUpdateVariantService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields: vi.fn(),
        });

        await expect(
            updateVariantService({
                variantId: currentVariant._id.toHexString(),
                input: {
                    salePrice: 25990000,
                },
            })
        ).rejects.toMatchObject({
            httpStatus: 422,
        });
        expect(variantRepository.updateVariantCoreFields).not.toHaveBeenCalled();
    });

    it("returns the admin detail graph including deleted variants", async () => {
        const product = createProductFixture({
            isDeleted: true,
            deletedAt: new Date("2026-03-12T03:00:00.000Z"),
        });
        const variants = [
            createVariantFixture({
                productId: product._id,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000088"),
                productId: product._id,
                isDeleted: true,
                deletedAt: new Date("2026-03-12T03:00:00.000Z"),
            }),
        ];
        const getProductDetailAdmin = createGetProductDetailAdminService({
            productRepository: {
                findProductById: vi.fn().mockResolvedValue(product),
            },
            variantRepository: {
                findVariantsByProductId: vi.fn().mockResolvedValue(variants),
            },
            validation: createCatalogValidation(),
        });

        const detail = await getProductDetailAdmin({
            productId: product._id.toHexString(),
        });

        expect(detail).toEqual({
            product,
            variants,
        });
    });

    it("soft deletes a product, cascades variant soft delete, and returns the admin detail graph", async () => {
        const product = createProductFixture();
        const deletedProduct = createProductFixture({
            isDeleted: true,
            deletedAt: new Date("2026-03-12T05:00:00.000Z"),
        });
        const deletedVariants = [
            createVariantFixture({
                productId: product._id,
                isDeleted: true,
                deletedAt: new Date("2026-03-12T05:00:00.000Z"),
            }),
        ];
        const productRepository = {
            findProductById: vi
                .fn()
                .mockResolvedValueOnce(product)
                .mockResolvedValueOnce(deletedProduct),
            softDeleteProductById: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const variantRepository = {
            softDeleteVariantsByProductId: vi
                .fn()
                .mockResolvedValue({ acknowledged: true }),
            findVariantsByProductId: vi.fn().mockResolvedValue(deletedVariants),
        };
        const rebuildProductDerivedFields = vi.fn().mockResolvedValue(undefined);
        const softDeleteProductService = createSoftDeleteProductService({
            productRepository,
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields,
        });

        const detail = await softDeleteProductService({
            productId: product._id.toHexString(),
            actorId: "admin-3",
        });

        expect(productRepository.softDeleteProductById).toHaveBeenCalledWith({
            productId: product._id.toHexString(),
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date),
            updatedBy: "admin-3",
        });
        expect(variantRepository.softDeleteVariantsByProductId).toHaveBeenCalledWith({
            productId: product._id.toHexString(),
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        });
        expect(rebuildProductDerivedFields).toHaveBeenCalledWith({
            productId: product._id.toHexString(),
        });
        expect(detail).toEqual({
            product: deletedProduct,
            variants: deletedVariants,
        });
    });

    it("soft deletes a variant and returns the deleted variant state", async () => {
        const currentVariant = createVariantFixture();
        const deletedVariant = createVariantFixture({
            isDeleted: true,
            deletedAt: new Date("2026-03-12T06:00:00.000Z"),
        });
        const variantRepository = {
            findVariantById: vi
                .fn()
                .mockResolvedValueOnce(currentVariant)
                .mockResolvedValueOnce(deletedVariant),
            softDeleteVariantById: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const rebuildProductDerivedFields = vi.fn().mockResolvedValue(undefined);
        const softDeleteVariantService = createSoftDeleteVariantService({
            variantRepository,
            validation: createCatalogValidation(),
            rebuildProductDerivedFields,
        });

        const variant = await softDeleteVariantService({
            variantId: currentVariant._id.toHexString(),
        });

        expect(variantRepository.softDeleteVariantById).toHaveBeenCalledWith({
            variantId: currentVariant._id.toHexString(),
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        });
        expect(rebuildProductDerivedFields).toHaveBeenCalledWith({
            productId: currentVariant.productId,
        });
        expect(variant.isDeleted).toBe(true);
    });
});
