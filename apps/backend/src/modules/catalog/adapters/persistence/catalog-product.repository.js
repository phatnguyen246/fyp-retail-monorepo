import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { toObjectId } from "../../utils/object-id.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogProductRepository({
    db,
    baseRepository = createCatalogBaseRepository({ db }),
} = {}) {
    return {
        findProductByProductGroupCode({ productGroupCode, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.products,
                fieldName: "productGroupCode",
                value: productGroupCode,
                projection,
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
    };
}

function omitInsertOnlyProductFields(document = {}) {
    const { _id, createdAt, ...updatableFields } = document;

    void _id;
    void createdAt;

    return updatableFields;
}
