export function createAccountBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Account persistence requires a database instance");
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
        findOneByField({ collectionName, fieldName, value, projection } = {}) {
            return getCollection(collectionName).findOne(
                { [fieldName]: value },
                projection ? { projection } : undefined
            );
        },
        insertOne({ collectionName, document, options } = {}) {
            return getCollection(collectionName).insertOne(document, options);
        },
    };
}

