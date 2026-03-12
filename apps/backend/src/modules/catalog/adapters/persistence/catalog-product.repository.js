import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { toObjectId, toObjectIdArray } from "../../utils/object-id.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogProductRepository({
    db,
    baseRepository = createCatalogBaseRepository({ db }),
} = {}) {
    return {
        findProductById({ productId, projection } = {}) {
            return baseRepository.findOneById({
                collectionName: CATALOG_COLLECTIONS.products,
                id: productId,
                projection,
            });
        },

        findProductByProductGroupCode({ productGroupCode, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.products,
                fieldName: "productGroupCode",
                value: productGroupCode,
                projection,
            });
        },

        findProductsByIds({ productIds, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: CATALOG_COLLECTIONS.products,
                fieldName: "_id",
                values: toObjectIdArray(productIds, "productIds"),
                projection,
            });
        },

        findProductsByFilter({
            filter = {},
            projection,
            sort,
            skip = 0,
            limit,
        } = {}) {
            const cursor = baseRepository
                .getCollection(CATALOG_COLLECTIONS.products)
                .find(filter, projection ? { projection } : undefined);

            if (sort && Object.keys(sort).length > 0) {
                cursor.sort(sort);
            }

            if (Number.isInteger(skip) && skip > 0) {
                cursor.skip(skip);
            }

            if (Number.isInteger(limit) && limit > 0) {
                cursor.limit(limit);
            }

            return cursor.toArray();
        },

        countProductsByFilter({ filter = {} } = {}) {
            return baseRepository
                .getCollection(CATALOG_COLLECTIONS.products)
                .countDocuments(filter);
        },

        createProduct({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: CATALOG_COLLECTIONS.products,
                document,
                options,
            });
        },

        upsertProductByProductGroupCode({
            productGroupCode,
            document,
        } = {}) {
            const updatedAt = document?.updatedAt ?? new Date();
            const createdAt = document?.createdAt ?? updatedAt;

            return baseRepository.upsertOneByField({
                collectionName: CATALOG_COLLECTIONS.products,
                fieldName: "productGroupCode",
                value: productGroupCode,
                set: {
                    ...omitInsertOnlyProductFields(document),
                    productGroupCode,
                    updatedAt,
                },
                setOnInsert: {
                    _id: toObjectId(document?._id, "_id"),
                    createdAt,
                },
            });
        },

        updateProductCoreFields({
            productId,
            coreFields,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.products,
                id: productId,
                set: {
                    ...coreFields,
                    updatedAt,
                },
            });
        },

        updateProductDerivedFields({
            productId,
            derivedFields,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.products,
                id: productId,
                set: {
                    ...derivedFields,
                    updatedAt,
                },
            });
        },

        softDeleteProductById({
            productId,
            deletedAt = new Date(),
            updatedAt = deletedAt,
            updatedBy,
        } = {}) {
            return baseRepository.updateOneById({
                collectionName: CATALOG_COLLECTIONS.products,
                id: productId,
                set: {
                    isDeleted: true,
                    deletedAt,
                    updatedAt,
                    ...(updatedBy !== undefined ? { updatedBy } : {}),
                },
            });
        },
    };
}

function omitInsertOnlyProductFields(document = {}) {
    const { _id, createdAt, ...updatableFields } = document;

    void _id;
    void createdAt;

    return updatableFields;
}
