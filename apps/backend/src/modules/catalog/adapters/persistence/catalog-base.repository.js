export function createCatalogBaseRepository({ db } = {}) {
    function getCollection(collectionName) {
        if (!db) {
            throw new Error("Catalog persistence requires a database instance");
        }

        return db.collection(collectionName);
    }

    return {
        ensureCodeUniqueIndex({ collectionName, indexName }) {
            return getCollection(collectionName).createIndex(
                { code: 1 },
                { unique: true, name: indexName }
            );
        },

        upsertSeedDocument({ collectionName, code, document }) {
            return getCollection(collectionName).updateOne(
                { code },
                { $setOnInsert: document },
                { upsert: true }
            );
        },
    };
}
