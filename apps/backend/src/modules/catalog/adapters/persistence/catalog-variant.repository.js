import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { toObjectId } from "../../utils/object-id.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogVariantRepository({
    db,
    baseRepository = createCatalogBaseRepository({ db }),
} = {}) {
    return {
        findVariantBySku({ sku, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.variants,
                fieldName: "sku",
                value: sku,
                projection,
            });
        },

        findVariantById({ variantId, projection } = {}) {
            return baseRepository.findOneById({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                projection,
            });
        },

        findVariantsByProductId({ productId, projection } = {}) {
            return baseRepository.findManyByField({
                collectionName: CATALOG_COLLECTIONS.variants,
                fieldName: "productId",
                value: toObjectId(productId, "productId"),
                projection,
            });
        },

        createVariant({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: CATALOG_COLLECTIONS.variants,
                document,
                options,
            });
        },

        upsertVariantBySku({ sku, document } = {}) {
            const updatedAt = document?.updatedAt ?? new Date();
            const createdAt = document?.createdAt ?? updatedAt;

            return baseRepository.upsertOneByField({
                collectionName: CATALOG_COLLECTIONS.variants,
                fieldName: "sku",
                value: sku,
                set: {
                    ...omitInsertOnlyVariantFields(document),
                    sku,
                    updatedAt,
                },
                setOnInsert: {
                    _id: toObjectId(document?._id, "_id"),
                    createdAt,
                },
            });
        },

        updateVariantCoreFields({
            variantId,
            coreFields,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                set: {
                    ...coreFields,
                    updatedAt,
                },
            });
        },

        updateVariantDerivedFields({
            variantId,
            derivedFields,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                set: {
                    ...derivedFields,
                    updatedAt,
                },
            });
        },

        addMediaId({
            variantId,
            mediaId,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneByIdWithOperators({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                update: {
                    $addToSet: {
                        mediaIds: toObjectId(mediaId, "mediaId"),
                    },
                    $set: {
                        updatedAt,
                    },
                },
            });
        },

        removeMediaId({
            variantId,
            mediaId,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneByIdWithOperators({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                update: {
                    $pull: {
                        mediaIds: toObjectId(mediaId, "mediaId"),
                    },
                    $set: {
                        updatedAt,
                    },
                },
            });
        },

        softDeleteVariantById({
            variantId,
            deletedAt = new Date(),
            updatedAt = deletedAt,
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.variants,
                id: variantId,
                set: {
                    isDeleted: true,
                    deletedAt,
                    updatedAt,
                },
            });
        },

        softDeleteVariantsByProductId({
            productId,
            deletedAt = new Date(),
            updatedAt = deletedAt,
        } = {}) {
            return baseRepository.updateManyByField({
                collectionName: CATALOG_COLLECTIONS.variants,
                fieldName: "productId",
                value: toObjectId(productId, "productId"),
                set: {
                    isDeleted: true,
                    deletedAt,
                    updatedAt,
                },
            });
        },
    };
}

function omitInsertOnlyVariantFields(document = {}) {
    const { _id, createdAt, ...updatableFields } = document;

    void _id;
    void createdAt;

    return updatableFields;
}
