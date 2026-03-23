import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createCart } from "../../cart/models/index.js";
import { CART_GUEST_COOKIE_NAME } from "../../cart/constants/index.js";
import {
    createBrandFixture,
    createCategoryFixture,
    createProductFixture,
    createProductMediaFixture,
    createTagFixture,
    createVariantFixture,
} from "../../catalog/tests/fixtures/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { createAuthTestCookie } from "./auth-test.helpers.js";

const PASSWORD = "password123";
const GUEST_CART_ID = "guest-auth-1";

function createBaseState() {
    const brand = createBrandFixture();
    const category = createCategoryFixture();
    const tag = createTagFixture();
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000701"),
        brandId: brand._id,
        categoryId: category._id,
        tagIds: [tag._id],
        productGroupCode: "AUTH_PHONE_1",
        title: "Auth Phone",
        hasActiveVariants: true,
        hasInStockVariants: true,
    });
    const variant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000702"),
        productId: product._id,
        sku: "AUTH-BLK-128",
    });
    const media = createProductMediaFixture({
        _id: new ObjectId("65f000000000000000000703"),
        productId: product._id,
        variantId: variant._id,
    });
    const inventoryRecord = createInventoryRecord({
        _id: new ObjectId("65f000000000000000000704"),
        variantId: variant._id,
        stockQuantity: 5,
        lowStockThreshold: 2,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
    });

    return {
        accounts: [],
        carts: [],
        brands: [brand],
        categories: [category],
        tags: [tag],
        badges: [],
        products: [product],
        variants: [variant],
        productMediaMetadata: [media],
        inventoryRecords: [inventoryRecord],
    };
}

function createGuestCartState() {
    const state = createBaseState();

    state.carts = [
        createCart({
            _id: new ObjectId("65f000000000000000000705"),
            ownerType: "guest",
            ownerKey: GUEST_CART_ID,
            items: [
                {
                    variantId: state.variants[0]._id,
                    quantity: 2,
                    selected: true,
                    addedAt: new Date("2026-03-12T00:00:00.000Z"),
                },
            ],
            createdAt: new Date("2026-03-12T00:00:00.000Z"),
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
        }),
    ];

    return state;
}

function createCatalogAdminState() {
    return createBaseState();
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
            find: (filter = {}, options = {}) =>
                createCursor(documents, filter, options.projection),
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

function createCursor(documents, filter, projection) {
    let sortConfig = null;
    let limitCount = null;
    let skipCount = 0;

    return {
        sort(config) {
            sortConfig = config;

            return this;
        },
        limit(value) {
            limitCount = value;

            return this;
        },
        skip(value) {
            skipCount = value;

            return this;
        },
        async toArray() {
            let results = documents.filter((document) => matchesFilter(document, filter));

            if (sortConfig) {
                const entries = Object.entries(sortConfig);

                results = [...results].sort((left, right) => {
                    for (const [fieldName, direction] of entries) {
                        const leftValue = getValue(left, fieldName);
                        const rightValue = getValue(right, fieldName);

                        if (compareValues(leftValue, rightValue) === 0) {
                            continue;
                        }

                        return compareValues(leftValue, rightValue) * Number(direction);
                    }

                    return 0;
                });
            }

            if (skipCount > 0) {
                results = results.slice(skipCount);
            }

            if (typeof limitCount === "number") {
                results = results.slice(0, limitCount);
            }

            if (!projection) {
                return results;
            }

            return results.map((document) => applyProjection(document, projection));
        },
    };
}

function applyProjection(document, projection = {}) {
    const projectedDocument = {};

    for (const [fieldName, enabled] of Object.entries(projection)) {
        if (!enabled) {
            continue;
        }

        projectedDocument[fieldName] = getValue(document, fieldName);
    }

    return projectedDocument;
}

function compareValues(leftValue, rightValue) {
    if (leftValue instanceof Date && rightValue instanceof Date) {
        return leftValue.getTime() - rightValue.getTime();
    }

    if (leftValue?.toHexString && rightValue?.toHexString) {
        return leftValue.toHexString().localeCompare(rightValue.toHexString());
    }

    if (leftValue < rightValue) {
        return -1;
    }

    if (leftValue > rightValue) {
        return 1;
    }

    return 0;
}

function getValue(document, path) {
    return String(path)
        .split(".")
        .reduce((value, segment) => value?.[segment], document);
}

function matchesFilter(document, filter = {}) {
    return Object.entries(filter).every(([fieldName, expectedValue]) =>
        matchCondition(getValue(document, fieldName), expectedValue)
    );
}

function matchCondition(actualValue, expectedValue) {
    if (
        expectedValue &&
        typeof expectedValue === "object" &&
        !Array.isArray(expectedValue) &&
        !(expectedValue instanceof Date) &&
        !(expectedValue instanceof ObjectId)
    ) {
        if (Object.prototype.hasOwnProperty.call(expectedValue, "$in")) {
            return expectedValue.$in.some((candidate) => valuesEqual(actualValue, candidate));
        }

        if (Object.prototype.hasOwnProperty.call(expectedValue, "$ne")) {
            return !valuesEqual(actualValue, expectedValue.$ne);
        }
    }

    return valuesEqual(actualValue, expectedValue);
}

function valuesEqual(leftValue, rightValue) {
    if (leftValue?.toHexString && rightValue?.toHexString) {
        return leftValue.toHexString() === rightValue.toHexString();
    }

    return leftValue === rightValue;
}

function applyUpdate(target, update, isInsert) {
    if (update.$set) {
        Object.assign(target, update.$set);
    }

    if (isInsert && update.$setOnInsert) {
        Object.assign(target, update.$setOnInsert);
    }
}

async function startServer(seedState) {
    const db = createInMemoryDb(seedState);
    const app = await createApp({
        connectMongoFn: async () => ({
            client: {
                close: async () => undefined,
            },
            db,
        }),
        storage: null,
    });
    const server = await new Promise((resolve) => {
        const runningServer = app.listen(0, () => resolve(runningServer));
    });
    const address = server.address();
    const host =
        address && typeof address === "object" && address.address === "::"
            ? "127.0.0.1"
            : address.address;

    return {
        db,
        server,
        url: `http://${host}:${address.port}`,
    };
}

function extractCookie(setCookieHeader, cookieName) {
    if (!setCookieHeader) {
        return null;
    }

    const headers = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];

    for (const headerValue of headers) {
        const [cookiePair] = String(headerValue).split(";");

        if (cookiePair.startsWith(`${cookieName}=`)) {
            return cookiePair;
        }
    }

    return null;
}

describe("auth HTTP integration", () => {
    let runningServer = null;

    afterEach(async () => {
        if (!runningServer) {
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

    it("registers a customer, sets auth cookie, and returns the current user", async () => {
        runningServer = await startServer(createBaseState());

        const response = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "Customer@Example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const body = await response.json();
        const accounts = runningServer.db.getState().get("accounts");

        expect(response.status).toBe(201);
        expect(body.data).toMatchObject({
            accountId: expect.any(String),
            email: "customer@example.com",
            role: "customer",
        });
        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({
            accountId: body.data.accountId,
            email: "customer@example.com",
            role: "customer",
        });
        expect(accounts[0].passwordHash).not.toBe(PASSWORD);
        expect(response.headers.get("set-cookie")).toContain("auth_access_token=");
    });

    it("rejects duplicate register by normalized email", async () => {
        runningServer = await startServer(createBaseState());

        await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const duplicateResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "Customer@Example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const duplicateBody = await duplicateResponse.json();

        expect(duplicateResponse.status).toBe(409);
        expect(duplicateBody.code).toBe("AUTH_CONFLICT");
    });

    it("supports login success and invalid credential failure with the same account", async () => {
        runningServer = await startServer(createBaseState());

        await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        await fetch(`${runningServer.url}/auth/logout`, {
            method: "POST",
        });

        const loginResponse = await fetch(`${runningServer.url}/auth/login`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
            }),
        });
        const loginBody = await loginResponse.json();
        const invalidResponse = await fetch(`${runningServer.url}/auth/login`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: "wrong-password",
            }),
        });
        const invalidBody = await invalidResponse.json();

        expect(loginResponse.status).toBe(200);
        expect(loginBody.data).toMatchObject({
            accountId: expect.any(String),
            email: "customer@example.com",
            role: "customer",
        });
        expect(loginResponse.headers.get("set-cookie")).toContain("auth_access_token=");

        expect(invalidResponse.status).toBe(401);
        expect(invalidBody.code).toBe("AUTH_INVALID_CREDENTIALS");
    });

    it("clears the auth cookie on logout", async () => {
        runningServer = await startServer(createBaseState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const authCookie = extractCookie(
            registerResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const logoutResponse = await fetch(`${runningServer.url}/auth/logout`, {
            method: "POST",
            headers: {
                cookie: authCookie,
            },
        });
        const logoutBody = await logoutResponse.json();

        expect(logoutResponse.status).toBe(200);
        expect(logoutBody.data.success).toBe(true);
        expect(logoutResponse.headers.get("set-cookie")).toContain("auth_access_token=;");
    });

    it("returns current user for /auth/me and 401 when unauthenticated", async () => {
        runningServer = await startServer(createBaseState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const authCookie = extractCookie(
            registerResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const meResponse = await fetch(`${runningServer.url}/auth/me`, {
            headers: {
                cookie: authCookie,
            },
        });
        const meBody = await meResponse.json();
        const missingResponse = await fetch(`${runningServer.url}/auth/me`);
        const missingBody = await missingResponse.json();

        expect(meResponse.status).toBe(200);
        expect(meBody.data).toMatchObject({
            accountId: expect.any(String),
            email: "customer@example.com",
            role: "customer",
        });

        expect(missingResponse.status).toBe(401);
        expect(missingBody.code).toBe("AUTH_UNAUTHORIZED");
    });

    it("blocks customer access and allows admin access on admin routes", async () => {
        runningServer = await startServer(createCatalogAdminState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const customerCookie = extractCookie(
            registerResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const customerResponse = await fetch(
            `${runningServer.url}/admin/catalog/products`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    cookie: customerCookie,
                },
                body: JSON.stringify({
                    productGroupCode: "ADMIN_CREATE_PHONE",
                    title: "Admin Create Phone",
                    brandCode: "APPLE",
                    categoryCode: "SMARTPHONE",
                    tagCodes: ["camera-phone"],
                    specs: {
                        chipset: "A19",
                    },
                }),
            }
        );
        const customerBody = await customerResponse.json();
        const adminResponse = await fetch(`${runningServer.url}/admin/catalog/products`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: createAuthTestCookie(),
            },
            body: JSON.stringify({
                productGroupCode: "ADMIN_CREATE_PHONE",
                title: "Admin Create Phone",
                brandCode: "APPLE",
                categoryCode: "SMARTPHONE",
                tagCodes: ["camera-phone"],
                specs: {
                    chipset: "A19",
                },
            }),
        });
        const adminBody = await adminResponse.json();

        expect(customerResponse.status).toBe(403);
        expect(customerBody.code).toBe("AUTH_FORBIDDEN");

        expect(adminResponse.status).toBe(201);
        expect(adminBody.data).toMatchObject({
            productGroupCode: "ADMIN_CREATE_PHONE",
            status: "draft",
        });
    });

    it("blocks customer access and allows admin access on the admin catalog list route", async () => {
        runningServer = await startServer(createCatalogAdminState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "customer-list@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const customerCookie = extractCookie(
            registerResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const customerResponse = await fetch(
            `${runningServer.url}/admin/catalog/products`,
            {
                headers: {
                    cookie: customerCookie,
                },
            }
        );
        const customerBody = await customerResponse.json();
        const adminResponse = await fetch(`${runningServer.url}/admin/catalog/products`, {
            headers: {
                cookie: createAuthTestCookie(),
            },
        });
        const adminBody = await adminResponse.json();

        expect(customerResponse.status).toBe(403);
        expect(customerBody.code).toBe("AUTH_FORBIDDEN");

        expect(adminResponse.status).toBe(200);
        expect(adminBody.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    productGroupCode: "AUTH_PHONE_1",
                    isDeleted: false,
                }),
            ])
        );
    });

    it("reassigns guest cart to the new customer on register", async () => {
        runningServer = await startServer(createGuestCartState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: `${CART_GUEST_COOKIE_NAME}=${GUEST_CART_ID}`,
            },
            body: JSON.stringify({
                email: "guestmerge@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const registerBody = await registerResponse.json();
        const authCookie = extractCookie(
            registerResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const cartResponse = await fetch(`${runningServer.url}/cart`, {
            headers: {
                cookie: [authCookie, `${CART_GUEST_COOKIE_NAME}=${GUEST_CART_ID}`].join("; "),
            },
        });
        const cartBody = await cartResponse.json();
        const carts = runningServer.db.getState().get("carts");

        expect(registerResponse.status).toBe(201);
        expect(registerBody.data.role).toBe("customer");
        expect(cartResponse.status).toBe(200);
        expect(cartBody.data.items).toHaveLength(1);
        expect(carts[0].ownerType).toBe("customer");
        expect(carts[0].ownerKey).toBe(registerBody.data.accountId);
    });

    it("does not merge guest cart on login to an existing account and keeps customer cart active", async () => {
        runningServer = await startServer(createGuestCartState());

        const registerResponse = await fetch(`${runningServer.url}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email: "existing@example.com",
                password: PASSWORD,
                confirmPassword: PASSWORD,
            }),
        });
        const registerBody = await registerResponse.json();
        const carts = runningServer.db.getState().get("carts");

        carts.push(
            createCart({
                _id: new ObjectId("65f000000000000000000706"),
                ownerType: "customer",
                ownerKey: registerBody.data.accountId,
                items: [
                    {
                        variantId: new ObjectId("65f000000000000000000702"),
                        quantity: 1,
                        selected: true,
                        addedAt: new Date("2026-03-12T00:00:00.000Z"),
                    },
                ],
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            })
        );

        await fetch(`${runningServer.url}/auth/logout`, {
            method: "POST",
        });

        const loginResponse = await fetch(`${runningServer.url}/auth/login`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: `${CART_GUEST_COOKIE_NAME}=${GUEST_CART_ID}`,
            },
            body: JSON.stringify({
                email: "existing@example.com",
                password: PASSWORD,
            }),
        });
        const authCookie = extractCookie(
            loginResponse.headers.get("set-cookie"),
            "auth_access_token"
        );
        const cartResponse = await fetch(`${runningServer.url}/cart`, {
            headers: {
                cookie: [authCookie, `${CART_GUEST_COOKIE_NAME}=${GUEST_CART_ID}`].join("; "),
            },
        });
        const cartBody = await cartResponse.json();
        const guestCart = carts.find((cart) => cart.ownerType === "guest");
        const customerCart = carts.find((cart) => cart.ownerType === "customer");

        expect(loginResponse.status).toBe(200);
        expect(cartResponse.status).toBe(200);
        expect(cartBody.data.items).toHaveLength(1);
        expect(customerCart.ownerKey).toBe(registerBody.data.accountId);
        expect(guestCart.ownerKey).toBe(GUEST_CART_ID);
    });

    it("returns 401 for admin routes without authentication", async () => {
        runningServer = await startServer(createCatalogAdminState());

        const response = await fetch(`${runningServer.url}/admin/catalog/products`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                productGroupCode: "UNAUTH_PHONE",
                title: "Unauth Phone",
                brandCode: "APPLE",
                categoryCode: "SMARTPHONE",
                tagCodes: ["camera-phone"],
                specs: {
                    chipset: "A19",
                },
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.code).toBe("AUTH_UNAUTHORIZED");
    });

    it("returns 401 for the admin catalog list route without authentication", async () => {
        runningServer = await startServer(createCatalogAdminState());

        const response = await fetch(`${runningServer.url}/admin/catalog/products`);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.code).toBe("AUTH_UNAUTHORIZED");
    });
});
