import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createAuthTestCookie } from "../../auth/tests/auth-test.helpers.js";
import { createInventoryRecord } from "../models/index.js";
import {
    createBrandFixture,
    createCategoryFixture,
    createProductFixture,
    createTagFixture,
    createVariantFixture,
} from "../../catalog/tests/fixtures/index.js";

const ADMIN_AUTH_COOKIE = createAuthTestCookie();

function createBaseCatalogState() {
    const brand = createBrandFixture();
    const category = createCategoryFixture();
    const tag = createTagFixture();

    return {
        brands: [brand],
        categories: [category],
        tags: [tag],
        badges: [],
        productMediaMetadata: [],
        inventoryRecords: [],
    };
}

function createCreateInventoryState() {
    const baseState = createBaseCatalogState();
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000301"),
        brandId: baseState.brands[0]._id,
        categoryId: baseState.categories[0]._id,
        tagIds: [baseState.tags[0]._id],
        productGroupCode: "CREATE_BOUNDARY_PHONE",
        title: "Create Boundary Phone",
        hasActiveVariants: true,
        hasInStockVariants: false,
    });
    const variant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000302"),
        productId: product._id,
        sku: "CREATE-BLK-128",
        isInStock: false,
    });

    return {
        ...baseState,
        products: [product],
        variants: [variant],
    };
}

function createSingleVariantUpdateState() {
    const state = createCreateInventoryState();
    const product = state.products[0];
    const variant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000312"),
        productId: product._id,
        sku: "PATCH-BLK-128",
        isInStock: true,
    });

    return {
        ...state,
        variants: [variant],
        products: [
            createProductFixture({
                ...product,
                _id: product._id,
                hasActiveVariants: true,
                hasInStockVariants: true,
            }),
        ],
        inventoryRecords: [
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000313"),
                variantId: variant._id,
                stockQuantity: 4,
                lowStockThreshold: 3,
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            }),
        ],
    };
}

function createPartialInStockState() {
    const baseState = createBaseCatalogState();
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000321"),
        brandId: baseState.brands[0]._id,
        categoryId: baseState.categories[0]._id,
        tagIds: [baseState.tags[0]._id],
        productGroupCode: "PARTIAL_STOCK_PHONE",
        title: "Partial Stock Phone",
        hasActiveVariants: true,
        hasInStockVariants: true,
    });
    const firstVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000322"),
        productId: product._id,
        sku: "PARTIAL-BLK-128",
        isInStock: true,
    });
    const secondVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000323"),
        productId: product._id,
        sku: "PARTIAL-BLU-256",
        variantAttributes: {
            ram: "12GB",
            rom: "256GB",
            color: "Blue",
        },
        originalPrice: 26990000,
        salePrice: 24990000,
        isInStock: true,
    });

    return {
        ...baseState,
        products: [product],
        variants: [firstVariant, secondVariant],
        inventoryRecords: [
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000324"),
                variantId: firstVariant._id,
                stockQuantity: 2,
                lowStockThreshold: 3,
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            }),
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000325"),
                variantId: secondVariant._id,
                stockQuantity: 7,
                lowStockThreshold: 3,
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            }),
        ],
    };
}

function createInMemoryDb(seedState) {
    const collections = new Map(
        Object.entries(seedState).map(([name, documents]) => [name, [...documents]])
    );

    function getCollection(name) {
        if (!collections.has(name)) {
            collections.set(name, []);
        }

        const documents = collections.get(name);

        return {
            createIndex: async () => "ok",
            insertOne: async (document) => {
                documents.push(document);

                return {
                    acknowledged: true,
                    insertedId: document._id,
                };
            },
            findOne: async (filter) =>
                documents.find((document) => matchesFilter(document, filter)) ?? null,
            find: (filter = {}) => createCursor(documents, filter),
            updateOne: async (filter, update, options = {}) => {
                const index = documents.findIndex((document) =>
                    matchesFilter(document, filter)
                );

                if (index === -1) {
                    if (!options.upsert) {
                        return {
                            acknowledged: true,
                            matchedCount: 0,
                            modifiedCount: 0,
                        };
                    }

                    const newDocument = {};
                    applyUpdate(newDocument, update, true);
                    documents.push(newDocument);

                    return {
                        acknowledged: true,
                        matchedCount: 0,
                        modifiedCount: 0,
                        upsertedCount: 1,
                    };
                }

                applyUpdate(documents[index], update, false);

                return {
                    acknowledged: true,
                    matchedCount: 1,
                    modifiedCount: 1,
                };
            },
            updateMany: async (filter, update) => {
                let modifiedCount = 0;

                for (const document of documents) {
                    if (!matchesFilter(document, filter)) {
                        continue;
                    }

                    applyUpdate(document, update, false);
                    modifiedCount += 1;
                }

                return {
                    acknowledged: true,
                    modifiedCount,
                };
            },
            countDocuments: async (filter = {}) =>
                documents.filter((document) => matchesFilter(document, filter)).length,
        };
    }

    return {
        collection(name) {
            return getCollection(name);
        },
        getState() {
            return collections;
        },
    };
}

function createCursor(documents, filter) {
    let sortConfig = null;
    let limitCount = null;

    return {
        sort(config) {
            sortConfig = config;

            return this;
        },
        limit(value) {
            limitCount = value;

            return this;
        },
        skip() {
            return this;
        },
        async toArray() {
            let results = documents.filter((document) =>
                matchesFilter(document, filter)
            );

            if (sortConfig) {
                results = [...results].sort((leftDocument, rightDocument) =>
                    compareBySort(leftDocument, rightDocument, sortConfig)
                );
            }

            if (Number.isInteger(limitCount) && limitCount >= 0) {
                results = results.slice(0, limitCount);
            }

            return results;
        },
    };
}

function applyUpdate(document, update, isInsert) {
    if (update.$setOnInsert && isInsert) {
        Object.assign(document, update.$setOnInsert);
    }

    if (update.$set) {
        Object.assign(document, update.$set);
    }

    if (update.$addToSet) {
        for (const [key, value] of Object.entries(update.$addToSet)) {
            const currentValues = Array.isArray(document[key]) ? document[key] : [];
            const hasValue = currentValues.some((currentValue) =>
                isEqualValue(currentValue, value)
            );

            if (!hasValue) {
                currentValues.push(value);
            }

            document[key] = currentValues;
        }
    }

    if (update.$pull) {
        for (const [key, value] of Object.entries(update.$pull)) {
            const currentValues = Array.isArray(document[key]) ? document[key] : [];
            document[key] = currentValues.filter(
                (currentValue) => !isEqualValue(currentValue, value)
            );
        }
    }
}

function matchesFilter(document, filter = {}) {
    return Object.entries(filter).every(([key, condition]) => {
        const value = getValueByPath(document, key);

        if (condition && typeof condition === "object" && !Array.isArray(condition)) {
            if ("$in" in condition) {
                const candidates = condition.$in ?? [];

                if (Array.isArray(value)) {
                    return value.some((item) =>
                        candidates.some((candidate) => isEqualValue(item, candidate))
                    );
                }

                return candidates.some((candidate) => isEqualValue(value, candidate));
            }

            if ("$ne" in condition) {
                return !isEqualValue(value, condition.$ne);
            }
        }

        return isEqualValue(value, condition);
    });
}

function getValueByPath(document, path) {
    return path.split(".").reduce((value, segment) => value?.[segment], document);
}

function normalizeComparable(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    return value;
}

function isEqualValue(leftValue, rightValue) {
    if (leftValue && typeof leftValue.toHexString === "function") {
        return leftValue.toHexString() === normalizeComparable(rightValue);
    }

    if (rightValue && typeof rightValue.toHexString === "function") {
        return normalizeComparable(leftValue) === rightValue.toHexString();
    }

    return leftValue === rightValue;
}

function compareBySort(leftDocument, rightDocument, sortConfig) {
    for (const [fieldName, direction] of Object.entries(sortConfig)) {
        const leftValue = normalizeComparable(getValueByPath(leftDocument, fieldName));
        const rightValue = normalizeComparable(getValueByPath(rightDocument, fieldName));

        if (leftValue < rightValue) {
            return direction === -1 ? 1 : -1;
        }

        if (leftValue > rightValue) {
            return direction === -1 ? -1 : 1;
        }
    }

    return 0;
}

async function startServer(seedState) {
    const db = createInMemoryDb(seedState);
    const client = {
        close: async () => undefined,
    };
    const app = await createApp({
        connectMongoFn: async () => ({
            client,
            db,
        }),
        storage: null,
    });
    const server = await new Promise((resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
    });
    const { port } = server.address();

    return {
        db,
        server,
        url: `http://127.0.0.1:${port}`,
    };
}

describe("inventory http integration", () => {
    let runningServer;

    afterEach(async () => {
        if (!runningServer?.server) {
            return;
        }

        await new Promise((resolve, reject) => {
            runningServer.server.close((error) => {
                if (error) {
                    reject(error);

                    return;
                }

                resolve();
            });
        });
        runningServer = null;
    });

    it("creates inventory and syncs catalog availability for an existing variant", async () => {
        runningServer = await startServer(createCreateInventoryState());

        const response = await fetch(`${runningServer.url}/admin/inventory/records`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: ADMIN_AUTH_COOKIE,
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000302",
                stockQuantity: 5,
            }),
        });
        const body = await response.json();
        const inventoryRecords = runningServer.db.getState().get("inventoryRecords");
        const variants = runningServer.db.getState().get("variants");
        const products = runningServer.db.getState().get("products");

        expect(response.status).toBe(201);
        expect(body.data).toMatchObject({
            variantId: "65f000000000000000000302",
            stockQuantity: 5,
            isInStock: true,
        });
        expect(inventoryRecords).toHaveLength(1);
        expect(inventoryRecords[0].variantId.toHexString()).toBe(
            "65f000000000000000000302"
        );
        expect(variants[0].isInStock).toBe(true);
        expect(products[0].hasInStockVariants).toBe(true);
    });

    it("updates a single-variant product to out-of-stock and rebuilds product availability", async () => {
        runningServer = await startServer(createSingleVariantUpdateState());

        const response = await fetch(
            `${runningServer.url}/admin/inventory/variants/65f000000000000000000312`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: ADMIN_AUTH_COOKIE,
                },
                body: JSON.stringify({
                    stockQuantity: 0,
                }),
            }
        );
        const body = await response.json();
        const variants = runningServer.db.getState().get("variants");
        const products = runningServer.db.getState().get("products");

        expect(response.status).toBe(200);
        expect(body.data).toMatchObject({
            variantId: "65f000000000000000000312",
            stockQuantity: 0,
            isInStock: false,
        });
        expect(variants[0].isInStock).toBe(false);
        expect(products[0].hasInStockVariants).toBe(false);
    });

    it("keeps product availability true when another variant remains in stock", async () => {
        runningServer = await startServer(createPartialInStockState());

        const response = await fetch(
            `${runningServer.url}/admin/inventory/variants/65f000000000000000000322`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: ADMIN_AUTH_COOKIE,
                },
                body: JSON.stringify({
                    stockQuantity: 0,
                }),
            }
        );
        const body = await response.json();
        const variants = runningServer.db.getState().get("variants");
        const products = runningServer.db.getState().get("products");

        expect(response.status).toBe(200);
        expect(body.data).toMatchObject({
            variantId: "65f000000000000000000322",
            stockQuantity: 0,
            isInStock: false,
        });
        expect(
            variants.find((variant) => variant._id.toHexString() === "65f000000000000000000322")
                .isInStock
        ).toBe(false);
        expect(
            variants.find((variant) => variant._id.toHexString() === "65f000000000000000000323")
                .isInStock
        ).toBe(true);
        expect(products[0].hasInStockVariants).toBe(true);
    });

    it("rejects inventory creation when the catalog variant does not exist", async () => {
        runningServer = await startServer(createCreateInventoryState());

        const response = await fetch(`${runningServer.url}/admin/inventory/records`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: ADMIN_AUTH_COOKIE,
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000399",
                stockQuantity: 1,
            }),
        });
        const body = await response.json();
        const inventoryRecords = runningServer.db.getState().get("inventoryRecords");

        expect(response.status).toBe(404);
        expect(body.code).toBe("INVENTORY_CATALOG_VARIANT_NOT_FOUND");
        expect(inventoryRecords).toHaveLength(0);
    });
});
