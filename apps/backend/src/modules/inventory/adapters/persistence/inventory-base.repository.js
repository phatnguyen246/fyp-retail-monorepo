export function createInventoryBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Inventory persistence requires a database instance");
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

        findOneByField({ collectionName, fieldName, value, projection }) {
            return getCollection(collectionName).findOne(
                { [fieldName]: value },
                projection ? { projection } : undefined
            );
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

        insertOne({ collectionName, document, options } = {}) {
            return getCollection(collectionName).insertOne(document, options);
        },

        updateOneByField({
            collectionName,
            fieldName,
            value,
            set,
            options,
        } = {}) {
            return getCollection(collectionName).updateOne(
                { [fieldName]: value },
                { $set: set },
                options
            );
        },
    };
}
