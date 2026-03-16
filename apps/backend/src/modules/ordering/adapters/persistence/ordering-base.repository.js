import { toObjectId } from "../../utils/object-id.js";

export function createOrderingBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Ordering persistence requires a database instance");
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

        findOneById({ collectionName, id, projection } = {}) {
            return getCollection(collectionName).findOne(
                { _id: toObjectId(id, "_id") },
                projection ? { projection } : undefined
            );
        },

        findManyByFilter({
            collectionName,
            filter = {},
            projection,
            sort,
            limit,
        } = {}) {
            const cursor = getCollection(collectionName).find(
                filter,
                projection ? { projection } : undefined
            );

            if (sort && Object.keys(sort).length > 0) {
                cursor.sort(sort);
            }

            if (Number.isInteger(limit) && limit > 0) {
                cursor.limit(limit);
            }

            return cursor.toArray();
        },

        insertOne({ collectionName, document, options } = {}) {
            return getCollection(collectionName).insertOne(document, options);
        },

        updateOneById({ collectionName, id, set, options } = {}) {
            return getCollection(collectionName).updateOne(
                { _id: toObjectId(id, "_id") },
                { $set: set },
                options
            );
        },

        updateOneByIdWithOperators({ collectionName, id, update, options } = {}) {
            return getCollection(collectionName).updateOne(
                { _id: toObjectId(id, "_id") },
                update,
                options
            );
        },
    };
}
