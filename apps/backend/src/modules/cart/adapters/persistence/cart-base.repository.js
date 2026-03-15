import { toObjectId } from "../../utils/object-id.js";

export function createCartBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Cart persistence requires a database instance");
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
        findOneByFilter({ collectionName, filter = {}, projection } = {}) {
            return getCollection(collectionName).findOne(
                filter,
                projection ? { projection } : undefined
            );
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
    };
}
