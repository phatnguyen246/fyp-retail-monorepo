import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createAuthTestCookie } from "../../auth/tests/auth-test.helpers.js";
import {
    createProductFixture,
    createProductMediaFixture,
    createVariantFixture,
} from "../../catalog/tests/fixtures/index.js";
import { createCart } from "../../cart/models/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { createOrder } from "../models/index.js";

const CUSTOMER_ACCOUNT_ID = "acc_customer_1";
const OTHER_CUSTOMER_ACCOUNT_ID = "acc_customer_2";
const ADMIN_ACCOUNT_ID = "acc_admin_1";
const GUEST_ID = "guest-order-1";
const CUSTOMER_AUTH_COOKIE = createAuthTestCookie({
    accountId: CUSTOMER_ACCOUNT_ID,
    role: "customer",
    email: "customer1@example.com",
});
const OTHER_CUSTOMER_AUTH_COOKIE = createAuthTestCookie({
    accountId: OTHER_CUSTOMER_ACCOUNT_ID,
    role: "customer",
    email: "customer2@example.com",
});
const ADMIN_AUTH_COOKIE = createAuthTestCookie({
    accountId: ADMIN_ACCOUNT_ID,
    role: "admin",
    email: "admin@example.com",
});
const GUEST_CART_COOKIE = "cart_guest_id=guest-order-1";
const BASE_TIMESTAMP = new Date("2026-03-16T00:00:00.000Z");

function createCatalogGraph() {
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000701"),
        title: "Checkout Phone",
        hasActiveVariants: true,
        hasInStockVariants: true,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });
    const firstVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000702"),
        productId: product._id,
        sku: "ORDER-BLK-128",
        salePrice: 19990000,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });
    const secondVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000703"),
        productId: product._id,
        sku: "ORDER-BLU-256",
        variantAttributes: {
            ram: "12GB",
            rom: "256GB",
            color: "Blue",
        },
        salePrice: 24990000,
        originalPrice: 26990000,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });
    const firstMedia = createProductMediaFixture({
        _id: new ObjectId("65f000000000000000000704"),
        productId: product._id,
        variantId: firstVariant._id,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });
    const secondMedia = createProductMediaFixture({
        _id: new ObjectId("65f000000000000000000705"),
        productId: product._id,
        variantId: secondVariant._id,
        url: "https://example.com/blue-phone.webp",
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });

    return {
        product,
        firstVariant,
        secondVariant,
        firstMedia,
        secondMedia,
    };
}

function createBaseState() {
    const graph = createCatalogGraph();

    return {
        brands: [],
        categories: [],
        tags: [],
        badges: [],
        products: [graph.product],
        variants: [graph.firstVariant, graph.secondVariant],
        productMediaMetadata: [graph.firstMedia, graph.secondMedia],
        inventoryRecords: [
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000706"),
                variantId: graph.firstVariant._id,
                stockQuantity: 5,
                lowStockThreshold: 2,
                createdAt: BASE_TIMESTAMP,
                updatedAt: BASE_TIMESTAMP,
            }),
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000707"),
                variantId: graph.secondVariant._id,
                stockQuantity: 7,
                lowStockThreshold: 2,
                createdAt: BASE_TIMESTAMP,
                updatedAt: BASE_TIMESTAMP,
            }),
        ],
        carts: [],
        orders: [],
        accounts: [],
    };
}

function createCustomerCartState() {
    const state = createBaseState();

    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000708"),
            ownerType: "customer",
            ownerKey: CUSTOMER_ACCOUNT_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 2,
                    selected: true,
                    addedAt: BASE_TIMESTAMP,
                },
                {
                    variantId: state.variants[1]._id,
                    quantity: 1,
                    selected: false,
                    addedAt: BASE_TIMESTAMP,
                },
            ],
            createdAt: BASE_TIMESTAMP,
            updatedAt: BASE_TIMESTAMP,
        }),
    ];

    return state;
}

function createGuestCartState() {
    const state = createBaseState();

    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000709"),
            ownerType: "guest",
            ownerKey: GUEST_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 1,
                    selected: true,
                    addedAt: BASE_TIMESTAMP,
                },
            ],
            createdAt: BASE_TIMESTAMP,
            updatedAt: BASE_TIMESTAMP,
        }),
    ];

    return state;
}

function createOrderFixture({
    orderId = new ObjectId(),
    accountId = CUSTOMER_ACCOUNT_ID,
    orderCode = "ORD-20260316-000001",
    orderStatus = "pending",
    items,
    createdAt = BASE_TIMESTAMP,
    updatedAt = BASE_TIMESTAMP,
} = {}) {
    const catalog = createCatalogGraph();
    const resolvedItems =
        items ??
        [
            {
                productId: catalog.product._id,
                variantId: catalog.firstVariant._id,
                sku: catalog.firstVariant.sku,
                productName: catalog.product.title,
                variantLabel: "8GB / 128GB / Black",
                thumbnailUrl: catalog.firstMedia.url,
                unitPrice: catalog.firstVariant.salePrice,
                quantity: 2,
                lineTotal: catalog.firstVariant.salePrice * 2,
            },
        ];
    const subtotal = resolvedItems.reduce((total, item) => total + item.lineTotal, 0);

    return createOrder({
        _id: orderId,
        orderCode,
        accountId,
        phoneNumber: "0900000000",
        shippingAddressLine: "123 Test Street",
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus,
        items: resolvedItems,
        subtotal,
        discountTotal: 0,
        shippingFee: 0,
        grandTotal: subtotal,
        statusLogs: [
            {
                fromStatus: null,
                toStatus: orderStatus,
                changedBy: accountId ? `customer:${accountId}` : "guest",
                changedAt: createdAt,
            },
        ],
        createdAt,
        updatedAt,
    });
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
                const hasOrderCodeConflict =
                    name === "orders" &&
                    documents.some(
                        (existingDocument) =>
                            existingDocument.orderCode === document.orderCode
                    );

                if (hasOrderCodeConflict) {
                    const error = new Error("Duplicate key");
                    error.code = 11000;
                    throw error;
                }

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

    if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
            const currentValues = Array.isArray(document[key]) ? document[key] : [];
            currentValues.push(value);
            document[key] = currentValues;
        }
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

    if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
            const currentValue =
                typeof document[key] === "number" ? document[key] : 0;
            document[key] = currentValue + value;
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

            if ("$gte" in condition) {
                return normalizeComparable(value) >= normalizeComparable(condition.$gte);
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

describe("ordering http integration", () => {
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

    it("creates a customer order from selected cart items and removes purchased lines", async () => {
        runningServer = await startServer(createCustomerCartState());

        const response = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                phoneNumber: "0900111222",
                shippingAddressLine: "1 Customer Street",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.data).toMatchObject({
            accountId: CUSTOMER_ACCOUNT_ID,
            paymentMethod: "cod",
            paymentStatus: "pending",
            orderStatus: "pending",
            subtotal: 39980000,
            grandTotal: 39980000,
            items: [
                {
                    variantId: "65f000000000000000000702",
                    sku: "ORDER-BLK-128",
                    quantity: 2,
                    lineTotal: 39980000,
                },
            ],
        });
        expect(body.data.statusLogs).toHaveLength(1);

        const carts = runningServer.db.getState().get("carts");
        const inventoryRecords = runningServer.db.getState().get("inventoryRecords");

        expect(carts[0].items).toHaveLength(1);
        expect(carts[0].items[0].variantId.toHexString()).toBe(
            "65f000000000000000000703"
        );
        expect(inventoryRecords[0].stockQuantity).toBe(3);
    });

    it("creates a guest order and lets the guest fetch detail by order id", async () => {
        runningServer = await startServer(createGuestCartState());

        const createResponse = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: GUEST_CART_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                phoneNumber: "0900222333",
                shippingAddressLine: "2 Guest Street",
            }),
        });
        const createBody = await createResponse.json();

        expect(createResponse.status).toBe(201);
        expect(createBody.data.accountId).toBeNull();

        const detailResponse = await fetch(
            `${runningServer.url}/orders/${createBody.data.id}`
        );
        const detailBody = await detailResponse.json();

        expect(detailResponse.status).toBe(200);
        expect(detailBody.data).toMatchObject({
            id: createBody.data.id,
            accountId: null,
            orderStatus: "pending",
        });
    });

    it("fails order creation when a checkout item becomes invalid", async () => {
        const state = createCustomerCartState();
        state.variants = [
            createVariantFixture({
                ...state.variants[0],
                _id: state.variants[0]._id,
                productId: state.products[0]._id,
                status: "inactive",
            }),
            state.variants[1],
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                phoneNumber: "0900111222",
                shippingAddressLine: "1 Customer Street",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.code).toBe("ORDER_CHECKOUT_INVALID");
        expect(body.meta).toMatchObject({
            variantId: "65f000000000000000000702",
            availabilityStatus: "variant_inactive",
        });
        expect(runningServer.db.getState().get("orders")).toHaveLength(0);
    });

    it("fails order creation when phoneNumber is missing", async () => {
        runningServer = await startServer(createCustomerCartState());

        const response = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                shippingAddressLine: "1 Customer Street",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("fails order creation when shippingAddressLine is missing", async () => {
        runningServer = await startServer(createCustomerCartState());

        const response = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                phoneNumber: "0900111222",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("lists only the authenticated customer's orders", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000710"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-111111",
            }),
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000711"),
                accountId: OTHER_CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-222222",
            }),
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000712"),
                accountId: null,
                orderCode: "ORD-20260316-333333",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/orders`, {
            headers: {
                cookie: CUSTOMER_AUTH_COOKIE,
            },
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].accountId).toBe(CUSTOMER_ACCOUNT_ID);
    });

    it("lets admins list all orders", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000713"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-444444",
            }),
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000714"),
                accountId: OTHER_CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-555555",
            }),
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000715"),
                accountId: null,
                orderCode: "ORD-20260316-666666",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/admin/orders`, {
            headers: {
                cookie: ADMIN_AUTH_COOKIE,
            },
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data).toHaveLength(3);
    });

    it("allows customers to cancel their own pending orders and restocks inventory", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000716"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-777777",
            }),
        ];
        state.inventoryRecords[0] = createInventoryRecord({
            _id: state.inventoryRecords[0]._id,
            variantId: state.variants[0]._id,
            stockQuantity: 3,
            lowStockThreshold: 2,
            createdAt: BASE_TIMESTAMP,
            updatedAt: BASE_TIMESTAMP,
        });
        runningServer = await startServer(state);

        const response = await fetch(
            `${runningServer.url}/orders/65f000000000000000000716/cancel`,
            {
                method: "POST",
                headers: {
                    cookie: CUSTOMER_AUTH_COOKIE,
                },
            }
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.orderStatus).toBe("cancelled");
        expect(runningServer.db.getState().get("inventoryRecords")[0].stockQuantity).toBe(5);
    });

    it("rejects cancellation for completed orders", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000717"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-888888",
                orderStatus: "completed",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(
            `${runningServer.url}/orders/65f000000000000000000717/cancel`,
            {
                method: "POST",
                headers: {
                    cookie: CUSTOMER_AUTH_COOKIE,
                },
            }
        );
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.code).toBe("ORDER_CANCELLATION_NOT_ALLOWED");
    });

    it("re-checks stock at checkout time", async () => {
        const state = createCustomerCartState();

        state.inventoryRecords[0] = createInventoryRecord({
            _id: state.inventoryRecords[0]._id,
            variantId: state.variants[0]._id,
            stockQuantity: 1,
            lowStockThreshold: 2,
            createdAt: BASE_TIMESTAMP,
            updatedAt: BASE_TIMESTAMP,
        });
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/orders`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                cartVariantIds: ["65f000000000000000000702"],
                phoneNumber: "0900111222",
                shippingAddressLine: "1 Customer Street",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.code).toBe("ORDER_CHECKOUT_INVALID");
        expect(body.meta).toMatchObject({
            availabilityStatus: "insufficient_stock",
        });
    });

    it("does not let guests view customer orders", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000718"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-999999",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(
            `${runningServer.url}/orders/65f000000000000000000718`
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.code).toBe("ORDER_NOT_FOUND");
    });

    it("supports valid and invalid admin status transitions", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000719"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-121212",
                orderStatus: "pending",
            }),
        ];
        runningServer = await startServer(state);

        const confirmResponse = await fetch(
            `${runningServer.url}/admin/orders/65f000000000000000000719/status`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: ADMIN_AUTH_COOKIE,
                },
                body: JSON.stringify({
                    orderStatus: "confirmed",
                }),
            }
        );
        const confirmBody = await confirmResponse.json();

        expect(confirmResponse.status).toBe(200);
        expect(confirmBody.data.orderStatus).toBe("confirmed");

        const invalidResponse = await fetch(
            `${runningServer.url}/admin/orders/65f000000000000000000719/status`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: ADMIN_AUTH_COOKIE,
                },
                body: JSON.stringify({
                    orderStatus: "confirmed",
                }),
            }
        );
        const invalidBody = await invalidResponse.json();

        expect(invalidResponse.status).toBe(409);
        expect(invalidBody.code).toBe("ORDER_STATUS_TRANSITION_INVALID");
    });

    it("enforces ownership on customer order detail", async () => {
        const state = createBaseState();

        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000720"),
                accountId: CUSTOMER_ACCOUNT_ID,
                orderCode: "ORD-20260316-131313",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(
            `${runningServer.url}/orders/65f000000000000000000720`,
            {
                headers: {
                    cookie: OTHER_CUSTOMER_AUTH_COOKIE,
                },
            }
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.code).toBe("ORDER_NOT_FOUND");
    });
});
