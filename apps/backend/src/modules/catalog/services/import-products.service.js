import { parse as parseCsv } from "csv-parse/sync";
import { createProduct, createVariant } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogBadRequestError,
    createCatalogConflictError,
    isDuplicateKeyError,
} from "./catalog-service.errors.js";
import {
    normalizeActorId,
    resolveProductReferences,
} from "./catalog-admin.service-helpers.js";

export function createImportProductsService({
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function importProducts({ file, actorId } = {}) {
        const parsedFile = validation.parseImportProductsFile(file ?? {});
        const parsedRows = parseImportCsvRows(parsedFile.buffer);

        if (parsedRows.length === 0) {
            throw createCatalogBadRequestError(
                "Catalog product import CSV must contain at least one data row"
            );
        }

        const normalizedActorId = normalizeActorId(actorId);
        const touchedProductIds = new Map();
        const touchedProducts = new Map();

        for (const row of parsedRows) {
            const parsedRow = validation.parseImportProductRow(row);
            const product = await upsertImportedProduct({
                parsedRow,
                normalizedActorId,
                productRepository,
                referenceRepository,
            });
            const existingVariant = await variantRepository.findVariantBySku({
                sku: parsedRow.sku,
            });

            await upsertImportedVariant({
                parsedRow,
                product,
                existingVariant,
                normalizedActorId,
                variantRepository,
            });

            touchedProductIds.set(product._id.toHexString(), product._id);
            touchedProducts.set(product.productGroupCode, product);

            if (
                existingVariant?.productId &&
                existingVariant.productId.toHexString() !== product._id.toHexString()
            ) {
                touchedProductIds.set(
                    existingVariant.productId.toHexString(),
                    existingVariant.productId
                );
            }
        }

        for (const productId of touchedProductIds.values()) {
            await rebuildProductDerivedFields({
                productId,
            });
        }

        return {
            data: {
                products: [...touchedProducts.values()].map((product) => ({
                    productId: product._id.toHexString(),
                    productGroupCode: product.productGroupCode,
                })),
            },
            meta: {
                rowCount: parsedRows.length,
                productCount: touchedProducts.size,
                variantCount: parsedRows.length,
            },
        };
    };
}

function parseImportCsvRows(buffer) {
    try {
        return parseCsv(buffer.toString("utf8"), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
        });
    } catch (error) {
        throw createCatalogBadRequestError("Catalog product import CSV is invalid", {
            reason: error.message,
        });
    }
}

async function upsertImportedProduct({
    parsedRow,
    normalizedActorId,
    productRepository,
    referenceRepository,
}) {
    const existingProduct =
        await productRepository.findProductByProductGroupCode({
            productGroupCode: parsedRow.productGroupCode,
        });
    const resolvedReferences = await resolveProductReferences({
        referenceRepository,
        brandCode: parsedRow.brandCode,
        categoryCode: parsedRow.categoryCode,
        tagCodes: parsedRow.tagCodes,
    });
    const product = createProduct({
        _id: existingProduct?._id,
        productGroupCode: parsedRow.productGroupCode,
        title: parsedRow.title,
        brandId: resolvedReferences.brandId,
        categoryId: resolvedReferences.categoryId,
        productType: parsedRow.productType,
        shortDescription: parsedRow.shortDescription,
        longDescription: parsedRow.longDescription,
        tagIds: resolvedReferences.tagIds,
        badges: parsedRow.badges,
        specs: {
            screen: {
                size: parsedRow.screenSize,
                technology: parsedRow.screenTechnology,
                resolution: parsedRow.screenResolution,
                refreshRate: parsedRow.screenRefreshRate,
            },
            chipset: parsedRow.chipset,
            rearCamera: parsedRow.rearCamera,
            frontCamera: parsedRow.frontCamera,
            battery: parsedRow.battery,
            operatingSystem: parsedRow.operatingSystem,
            sim: parsedRow.sim,
            network: parsedRow.network,
            charging: parsedRow.charging,
            dimensions: parsedRow.dimensions,
            weight: parsedRow.weight,
            material: parsedRow.material,
            waterResistance: parsedRow.waterResistance,
        },
        status: "draft",
        contactWhenOutOfStock: parsedRow.contactWhenOutOfStock,
        createdAt: existingProduct?.createdAt,
        createdBy: existingProduct?.createdBy ?? normalizedActorId,
        updatedBy: normalizedActorId ?? existingProduct?.updatedBy ?? null,
        isDeleted: existingProduct?.isDeleted ?? false,
        deletedAt: existingProduct?.deletedAt ?? null,
        defaultSelectedVariantId: existingProduct?.defaultSelectedVariantId ?? null,
        listingVariantSnapshot: existingProduct?.listingVariantSnapshot ?? null,
        minSalePrice: existingProduct?.minSalePrice ?? null,
        minOriginalPrice: existingProduct?.minOriginalPrice ?? null,
        hasActiveVariants: existingProduct?.hasActiveVariants ?? false,
        hasInStockVariants: existingProduct?.hasInStockVariants ?? false,
    });

    try {
        await productRepository.upsertProductByProductGroupCode({
            productGroupCode: parsedRow.productGroupCode,
            document: product,
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw createCatalogConflictError(
                `Catalog productGroupCode already exists: ${parsedRow.productGroupCode}`,
                {
                    field: "productGroupCode",
                    value: parsedRow.productGroupCode,
                }
            );
        }

        throw error;
    }

    return (
        (await productRepository.findProductByProductGroupCode({
            productGroupCode: parsedRow.productGroupCode,
        })) ?? product
    );
}

async function upsertImportedVariant({
    parsedRow,
    product,
    existingVariant,
    variantRepository,
}) {
    const variant = createVariant({
        _id: existingVariant?._id,
        productId: product._id,
        sku: parsedRow.sku,
        variantAttributes: {
            ram: parsedRow.ram,
            rom: parsedRow.rom,
            color: parsedRow.color,
        },
        ramSort: parsedRow.ramSort,
        romSort: parsedRow.romSort,
        colorPriority: parsedRow.colorPriority,
        variantSortOrder: parsedRow.variantSortOrder,
        isPrimaryColor: parsedRow.isPrimaryColor,
        originalPrice: parsedRow.originalPrice,
        salePrice: parsedRow.salePrice,
        currency: parsedRow.currency,
        video: parsedRow.videoUrl
            ? {
                  url: parsedRow.videoUrl,
                  thumbnailUrl: parsedRow.videoThumbnailUrl,
              }
            : null,
        status: parsedRow.variantStatus,
        createdAt: existingVariant?.createdAt,
        mediaIds: existingVariant?.mediaIds ?? [],
        isInStock: existingVariant?.isInStock ?? false,
        isDeleted: existingVariant?.isDeleted ?? false,
        deletedAt: existingVariant?.deletedAt ?? null,
    });

    try {
        await variantRepository.upsertVariantBySku({
            sku: parsedRow.sku,
            document: variant,
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw createCatalogConflictError(
                `Catalog sku already exists: ${parsedRow.sku}`,
                {
                    field: "sku",
                    value: parsedRow.sku,
                }
            );
        }

        throw error;
    }
}
