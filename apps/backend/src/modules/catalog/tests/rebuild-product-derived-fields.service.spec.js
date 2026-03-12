import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createRebuildProductDerivedFieldsService } from "../services/rebuild-product-derived-fields.service.js";
import {
    createProductFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("rebuildProductDerivedFields service", () => {
    it("fetches the product graph, computes derived fields, persists them, and returns the patch", async () => {
        const product = createProductFixture();
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000032"),
            }),
        ];
        const derivedFields = {
            slug: "iphone-16",
            defaultSelectedVariantId: variants[0]._id,
            listingVariantSnapshot: {
                variantId: variants[0]._id,
                sku: variants[0].sku,
                color: variants[0].variantAttributes.color,
                ram: variants[0].variantAttributes.ram,
                rom: variants[0].variantAttributes.rom,
                salePrice: variants[0].salePrice,
                originalPrice: variants[0].originalPrice,
                currency: variants[0].currency,
            },
            minSalePrice: variants[0].salePrice,
            minOriginalPrice: variants[0].originalPrice,
            hasActiveVariants: true,
            hasInStockVariants: true,
        };
        const productRepository = {
            findProductById: vi.fn().mockResolvedValue(product),
            updateProductDerivedFields: vi.fn().mockResolvedValue(undefined),
        };
        const variantRepository = {
            findVariantsByProductId: vi.fn().mockResolvedValue(variants),
        };
        const computeDerivedFields = vi.fn().mockReturnValue(derivedFields);
        const rebuildProductDerivedFields = createRebuildProductDerivedFieldsService({
            productRepository,
            variantRepository,
            computeDerivedFields,
        });

        const result = await rebuildProductDerivedFields({
            productId: product._id,
        });

        expect(productRepository.findProductById).toHaveBeenCalledWith({
            productId: product._id,
        });
        expect(variantRepository.findVariantsByProductId).toHaveBeenCalledWith({
            productId: product._id,
        });
        expect(computeDerivedFields).toHaveBeenCalledWith({
            product,
            variants,
        });
        expect(productRepository.updateProductDerivedFields).toHaveBeenCalledWith({
            productId: product._id,
            derivedFields,
        });
        expect(result).toEqual(derivedFields);
    });

    it("throws a clear error when the product does not exist", async () => {
        const productRepository = {
            findProductById: vi.fn().mockResolvedValue(null),
            updateProductDerivedFields: vi.fn(),
        };
        const variantRepository = {
            findVariantsByProductId: vi.fn(),
        };
        const rebuildProductDerivedFields = createRebuildProductDerivedFieldsService({
            productRepository,
            variantRepository,
        });

        await expect(
            rebuildProductDerivedFields({
                productId: new ObjectId("65f000000000000000000033"),
            })
        ).rejects.toThrow(/derived field rebuild/);
        expect(variantRepository.findVariantsByProductId).not.toHaveBeenCalled();
        expect(productRepository.updateProductDerivedFields).not.toHaveBeenCalled();
    });
});
