import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createCart } from "../models/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import {
    createProductFixture,
    createProductMediaFixture,
    createVariantFixture,
} from "../../catalog/tests/fixtures/index.js";

const CART_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");
const EXISTING_GUEST_ID = "guest-cart-1";

function createCartBaseState() {
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000601"),
        hasActiveVariants: true,
        hasInStockVariants: true,
    });
    const variant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000602"),
        productId: product._id,
        sku: "CART-BLK-128",
    });
    const media = createProductMediaFixture({
        _id: new ObjectId("65f000000000000000000603"),
        productId: product._id,
        variantId: variant._id,
    });
    const inventoryRecord = createInventoryRecord({
        _id: new ObjectId("65f000000000000000000604"),
        variantId: variant._id,
        stockQuantity: 5,
        lowStockThreshold: 2,
        createdAt: CART_TIMESTAMP,
        updatedAt: CART_TIMESTAMP,
    });

    return {
        carts: [],
        products: [product],
        variants: [variant],
        productMediaMetadata: [media],
        inventoryRecords: [inventoryRecord],
        brands: [],
        categories: [],
        tags: [],
        badges: [],
    };
}

function createStaleOutOfStockState() {
    const state = createCartBaseState();

    state.inventoryRecords = [
        createInventoryRecord({
            _id: new ObjectId("65f000000000000000000614"),
            variantId: state.variants[0]._id,
            stockQuantity: 0,
            lowStockThreshold: 2,
            createdAt: CART_TIMESTAMP,
            updatedAt: CART_TIMESTAMP,
        }),
    ];
    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000615"),
            ownerType: "guest",
            ownerKey: EXISTING_GUEST_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 2,
                    selected: true,
                    addedAt: CART_TIMESTAMP,
                },
            ],
            createdAt: CART_TIMESTAMP,
            updatedAt: CART_TIMESTAMP,
        }),
    ];

    return state;
}

function createRecoveredSelectionState() {
    const state = createCartBaseState();

    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000625"),
            ownerType: "guest",
            ownerKey: EXISTING_GUEST_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 1,
                    selected: false,
                    addedAt: CART_TIMESTAMP,
                },
            ],
            createdAt: CART_TIMESTAMP,
            updatedAt: CART_TIMESTAMP,
        }),
    ];

    return state;
}

function createInactiveVariantState() {
    const state = createCartBaseState();

    state.variants = [
        createVariantFixture({
            ...state.variants[0],
            _id: state.variants[0]._id,
            productId: state.products[0]._id,
            status: "inactive",
        }),
    ];

    return state;
}

function createDeletedProductState() {
    const state = createCartBaseState();

    state.products = [
        createProductFixture({
            ...state.products[0],
            _id: state.products[0]._id,
            isDeleted: true,
            hasActiveVariants: true,
            hasInStockVariants: true,
        }),
    ];
    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000635"),
            ownerType: "guest",
            ownerKey: EXISTING_GUEST_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 1,
                    selected: true,
                    addedAt: CART_TIMESTAMP,
                },
            ],
            createdAt: CART_TIMESTAMP,
            updatedAt: CART_TIMESTAMP,
        }),
    ];

    return state;
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

describe("cart http integration", () => {
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

    it("returns an empty cart on GET without issuing a guest cookie", async () => {
        runningServer = await startServer(createCartBaseState());

        const response = await fetch(`${runningServer.url}/cart`);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data).toEqual({
            id: null,
            items: [],
            summary: {
                totalQuantity: 0,
                selectedQuantity: 0,
                totalAmount: 0,
            },
        });
        expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("creates a guest cart on add, supports update/delete/clear, and keeps delete idempotent", async () => {
        runningServer = await startServer(createCartBaseState());

        const addResponse = await fetch(`${runningServer.url}/cart/items`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000602",
            }),
        });
        const addBody = await addResponse.json();
        const setCookie = addResponse.headers.get("set-cookie");
        const cookieHeader = setCookie.split(";")[0];

        expect(addResponse.status).toBe(200);
        expect(setCookie).toContain("cart_guest_id=");
        expect(addBody.data.item).toMatchObject({
            variantId: "65f000000000000000000602",
            quantity: 1,
            selected: true,
            isAvailable: true,
            availabilityStatus: "available",
        });
        expect(addBody.data.summary).toEqual({
            totalQuantity: 1,
            selectedQuantity: 1,
            totalAmount: 22990000,
        });

        const patchResponse = await fetch(
            `${runningServer.url}/cart/items/65f000000000000000000602`,
            {
                method: "PATCH",
                headers: {
                    cookie: cookieHeader,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    quantity: 3,
                }),
            }
        );
        const patchBody = await patchResponse.json();

        expect(patchResponse.status).toBe(200);
        expect(patchBody.data.item).toMatchObject({
            variantId: "65f000000000000000000602",
            quantity: 3,
            selected: true,
        });
        expect(patchBody.data.summary).toEqual({
            totalQuantity: 3,
            selectedQuantity: 3,
            totalAmount: 68970000,
        });

        const patchMissingResponse = await fetch(
            `${runningServer.url}/cart/items/65f000000000000000000699`,
            {
                method: "PATCH",
                headers: {
                    cookie: cookieHeader,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    quantity: 2,
                }),
            }
        );
        const patchMissingBody = await patchMissingResponse.json();

        expect(patchMissingResponse.status).toBe(404);
        expect(patchMissingBody.code).toBe("CART_ITEM_NOT_FOUND");

        const deleteMissingResponse = await fetch(
            `${runningServer.url}/cart/items/65f000000000000000000699`,
            {
                method: "DELETE",
                headers: {
                    cookie: cookieHeader,
                },
            }
        );
        const deleteMissingBody = await deleteMissingResponse.json();

        expect(deleteMissingResponse.status).toBe(200);
        expect(deleteMissingBody.data).toEqual({
            cartId: addBody.data.cartId,
            variantId: "65f000000000000000000699",
            removed: false,
            summary: {
                totalQuantity: 3,
                selectedQuantity: 3,
                totalAmount: 68970000,
            },
        });

        const deleteExistingResponse = await fetch(
            `${runningServer.url}/cart/items/65f000000000000000000602`,
            {
                method: "DELETE",
                headers: {
                    cookie: cookieHeader,
                },
            }
        );
        const deleteExistingBody = await deleteExistingResponse.json();

        expect(deleteExistingResponse.status).toBe(200);
        expect(deleteExistingBody.data).toEqual({
            cartId: addBody.data.cartId,
            variantId: "65f000000000000000000602",
            removed: true,
            summary: {
                totalQuantity: 0,
                selectedQuantity: 0,
                totalAmount: 0,
            },
        });

        const secondAddResponse = await fetch(`${runningServer.url}/cart/items`, {
            method: "POST",
            headers: {
                cookie: cookieHeader,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000602",
            }),
        });
        const secondAddBody = await secondAddResponse.json();

        expect(secondAddResponse.status).toBe(200);
        expect(secondAddBody.data.summary).toEqual({
            totalQuantity: 1,
            selectedQuantity: 1,
            totalAmount: 22990000,
        });

        const clearResponse = await fetch(`${runningServer.url}/cart`, {
            method: "DELETE",
            headers: {
                cookie: cookieHeader,
            },
        });
        const clearBody = await clearResponse.json();
        const carts = runningServer.db.getState().get("carts");

        expect(clearResponse.status).toBe(200);
        expect(clearBody.data).toEqual({
            cartId: addBody.data.cartId,
            cleared: true,
            summary: {
                totalQuantity: 0,
                selectedQuantity: 0,
                totalAmount: 0,
            },
        });
        expect(carts).toHaveLength(1);
        expect(carts[0].items).toEqual([]);
    });

    it("does not issue a guest cookie when add-to-cart fails validation against catalog state", async () => {
        runningServer = await startServer(createInactiveVariantState());

        const response = await fetch(`${runningServer.url}/cart/items`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000602",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.code).toBe("CART_VARIANT_UNAVAILABLE");
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(runningServer.db.getState().get("carts")).toEqual([]);
    });

    it("keeps stale out-of-stock items in the cart but auto-deselects them on read", async () => {
        runningServer = await startServer(createStaleOutOfStockState());

        const response = await fetch(`${runningServer.url}/cart`, {
            headers: {
                cookie: `cart_guest_id=${EXISTING_GUEST_ID}`,
            },
        });
        const body = await response.json();
        const carts = runningServer.db.getState().get("carts");

        expect(response.status).toBe(200);
        expect(body.data.items[0]).toMatchObject({
            variantId: "65f000000000000000000602",
            quantity: 2,
            selected: false,
            isAvailable: false,
            availabilityStatus: "out_of_stock",
        });
        expect(body.data.summary).toEqual({
            totalQuantity: 2,
            selectedQuantity: 0,
            totalAmount: 0,
        });
        expect(carts[0].items[0].selected).toBe(false);
    });

    it("treats a successful add on an existing invalid line as an explicit reactivation", async () => {
        runningServer = await startServer(createRecoveredSelectionState());

        const response = await fetch(`${runningServer.url}/cart/items`, {
            method: "POST",
            headers: {
                cookie: `cart_guest_id=${EXISTING_GUEST_ID}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                variantId: "65f000000000000000000602",
            }),
        });
        const body = await response.json();
        const carts = runningServer.db.getState().get("carts");

        expect(response.status).toBe(200);
        expect(body.data.item).toMatchObject({
            variantId: "65f000000000000000000602",
            quantity: 2,
            selected: true,
            isAvailable: true,
        });
        expect(body.data.summary).toEqual({
            totalQuantity: 2,
            selectedQuantity: 2,
            totalAmount: 45980000,
        });
        expect(carts[0].items[0].selected).toBe(true);
        expect(carts[0].items[0].quantity).toBe(2);
    });

    it("keeps deleted-product items visible but invalid on cart read", async () => {
        runningServer = await startServer(createDeletedProductState());

        const response = await fetch(`${runningServer.url}/cart`, {
            headers: {
                cookie: `cart_guest_id=${EXISTING_GUEST_ID}`,
            },
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.items[0]).toMatchObject({
            variantId: "65f000000000000000000602",
            selected: false,
            isAvailable: false,
            availabilityStatus: "product_deleted",
        });
        expect(body.data.summary).toEqual({
            totalQuantity: 1,
            selectedQuantity: 0,
            totalAmount: 0,
        });
    });
});
