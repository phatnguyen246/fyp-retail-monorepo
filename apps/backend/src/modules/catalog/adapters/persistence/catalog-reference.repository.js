import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { toObjectIdArray } from "../../utils/object-id.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogReferenceRepository({
    db,
    baseRepository = createCatalogBaseRepository({ db }),
} = {}) {
    return {
        findBrandByCode({ code, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.brands,
                fieldName: "code",
                value: code,
                projection,
            });
        },

        findCategoryByCode({ code, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.categories,
                fieldName: "code",
                value: code,
                projection,
            });
        },

        findTagByCode({ code, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: CATALOG_COLLECTIONS.tags,
                fieldName: "code",
                value: code,
                projection,
            });
        },

        findTagsByCodes({ codes, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: CATALOG_COLLECTIONS.tags,
                fieldName: "code",
                values: codes,
                projection,
            });
        },

        findBrandsByIds({ brandIds, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: CATALOG_COLLECTIONS.brands,
                fieldName: "_id",
                values: toObjectIdArray(brandIds, "brandIds"),
                projection,
            });
        },

        findCategoriesByIds({ categoryIds, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: CATALOG_COLLECTIONS.categories,
                fieldName: "_id",
                values: toObjectIdArray(categoryIds, "categoryIds"),
                projection,
            });
        },

        findTagsByIds({ tagIds, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: CATALOG_COLLECTIONS.tags,
                fieldName: "_id",
                values: toObjectIdArray(tagIds, "tagIds"),
                projection,
            });
        },
    };
}
