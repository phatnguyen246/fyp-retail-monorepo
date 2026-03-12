import { toObjectId } from "../../utils/object-id.js";

export function createCatalogBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Catalog persistence requires a database instance");
        }

        return db.collection(collectionName);
    }

    function ensureIndex({
        collectionName,
        key,
        indexName,
        unique = false,
        partialFilterExpression,
    }) {
        return getCollection(collectionName).createIndex(key, {
            unique,
            name: indexName,
            ...(partialFilterExpression ? { partialFilterExpression } : {}),
        });
    }

    return {
        ensureIndex,

        getCollection,

        ensureUniqueIndex(definition) {
            return ensureIndex({
                ...definition,
                unique: true,
            });
        },

        ensureCodeUniqueIndex({ collectionName, indexName }) {
            return ensureIndex({
                collectionName,
                key: { code: 1 },
                indexName,
                unique: true,
            });
        },

        upsertSeedDocument({ collectionName, code, document }) {
            return getCollection(collectionName).updateOne(
                { code },
                { $setOnInsert: document },
                { upsert: true }
            );
        },

        findOneByField({ collectionName, fieldName, value, projection }) {
            return getCollection(collectionName).findOne(
                { [fieldName]: value },
                projection ? { projection } : undefined
            );
        },

        insertOne({ collectionName, document, options } = {}) {
            return getCollection(collectionName).insertOne(document, options);
        },

        findOneById({ collectionName, id, projection }) {
            return getCollection(collectionName).findOne(
                { _id: toObjectId(id, "_id") },
                projection ? { projection } : undefined
            );
        },

        findManyByField({ collectionName, fieldName, value, projection }) {
            return getCollection(collectionName)
                .find(
                    { [fieldName]: value },
                    projection ? { projection } : undefined
                )
                .toArray();
        },

        findManyByFilter({
            collectionName,
            filter = {},
            projection,
            sort,
        } = {}) {
            const cursor = getCollection(collectionName).find(
                filter,
                projection ? { projection } : undefined
            );

            if (sort && Object.keys(sort).length > 0) {
                cursor.sort(sort);
            }

            return cursor.toArray();
        },

        findManyByFieldValues({
            collectionName,
            fieldName,
            values,
            projection,
        }) {
            if (!Array.isArray(values) || values.length === 0) {
                return Promise.resolve([]);
            }

            return getCollection(collectionName)
                .find(
                    { [fieldName]: { $in: values } },
                    projection ? { projection } : undefined
                )
                .toArray();
        },

        upsertOneByField({
            collectionName,
            fieldName,
            value,
            set,
            setOnInsert,
            options,
        }) {
            const updateDocument = {};

            if (set && Object.keys(set).length > 0) {
                updateDocument.$set = set;
            }

            if (setOnInsert && Object.keys(setOnInsert).length > 0) {
                updateDocument.$setOnInsert = setOnInsert;
            }

            return getCollection(collectionName).updateOne(
                { [fieldName]: value },
                updateDocument,
                {
                    upsert: true,
                    ...(options ?? {}),
                }
            );
        },

        updateOneById({ collectionName, id, set, options }) {
            return getCollection(collectionName).updateOne(
                { _id: toObjectId(id, "_id") },
                { $set: set },
                options
            );
        },

        updateOneByIdWithOperators({ collectionName, id, update, options }) {
            return getCollection(collectionName).updateOne(
                { _id: toObjectId(id, "_id") },
                update,
                options
            );
        },

        updateManyByField({ collectionName, fieldName, value, set, options } = {}) {
            return getCollection(collectionName).updateMany(
                { [fieldName]: value },
                { $set: set },
                options
            );
        },

        deleteOneById({ collectionName, id, options } = {}) {
            return getCollection(collectionName).deleteOne(
                { _id: toObjectId(id, "_id") },
                options
            );
        },
    };
}
