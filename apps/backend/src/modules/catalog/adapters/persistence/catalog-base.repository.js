import { toObjectId } from "../../utils/object-id.js";

export function createCatalogBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Catalog persistence requires a database instance");
        }

        return db.collection(collectionName);
    }

    function ensureUniqueIndex({
        collectionName,
        key,
        indexName,
        partialFilterExpression,
    }) {
        return getCollection(collectionName).createIndex(key, {
            unique: true,
            name: indexName,
            ...(partialFilterExpression ? { partialFilterExpression } : {}),
        });
    }

    return {
        ensureUniqueIndex,

        ensureCodeUniqueIndex({ collectionName, indexName }) {
            return ensureUniqueIndex({
                collectionName,
                key: { code: 1 },
                indexName,
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
    };
}
