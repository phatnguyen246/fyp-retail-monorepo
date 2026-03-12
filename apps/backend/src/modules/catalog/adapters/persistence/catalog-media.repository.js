import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { toObjectId, toObjectIdArray } from "../../utils/object-id.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogMediaRepository({
    db,
    baseRepository = createCatalogBaseRepository({ db }),
} = {}) {
    return {
        createMedia({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
                document,
                options,
            });
        },

        findMediaById({ mediaId, projection } = {}) {
            return baseRepository.findOneById({
                collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
                id: mediaId,
                projection,
            });
        },

        findMediaByIdForVariant({ mediaId, variantId, projection } = {}) {
            return baseRepository.getCollection(
                CATALOG_COLLECTIONS.productMediaMetadata
            ).findOne(
                {
                    _id: toObjectId(mediaId, "mediaId"),
                    variantId: toObjectId(variantId, "variantId"),
                },
                projection ? { projection } : undefined
            );
        },

        listMediaByVariantId({ variantId, projection } = {}) {
            return baseRepository.findManyByFilter({
                collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
                filter: {
                    variantId: toObjectId(variantId, "variantId"),
                },
                projection,
                sort: {
                    sortOrder: 1,
                    createdAt: 1,
                    _id: 1,
                },
            });
        },

        listMediaByVariantIds({ variantIds, projection } = {}) {
            return baseRepository.findManyByFilter({
                collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
                filter: {
                    variantId: {
                        $in: toObjectIdArray(variantIds, "variantIds"),
                    },
                },
                projection,
                sort: {
                    variantId: 1,
                    sortOrder: 1,
                    createdAt: 1,
                    _id: 1,
                },
            });
        },

        deleteMediaById({ mediaId, options } = {}) {
            return baseRepository.deleteOneById({
                collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
                id: mediaId,
                options,
            });
        },

        deleteMediaByIdForVariant({ mediaId, variantId, options } = {}) {
            return baseRepository.getCollection(
                CATALOG_COLLECTIONS.productMediaMetadata
            ).deleteOne(
                {
                    _id: toObjectId(mediaId, "mediaId"),
                    variantId: toObjectId(variantId, "variantId"),
                },
                options
            );
        },
    };
}
