import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import qs from "qs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createAuthTestCookie } from "../../auth/tests/auth-test.helpers.js";
import {
    createProductFixture,
    createVariantFixture,
} from "../../catalog/tests/fixtures/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { createOrder } from "../../ordering/models/index.js";
import { createPayment } from "../models/index.js";

const CUSTOMER_ACCOUNT_ID = "acc_customer_1";
const OTHER_CUSTOMER_ACCOUNT_ID = "acc_customer_2";
const ADMIN_ACCOUNT_ID = "acc_admin_1";
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
const BASE_TIMESTAMP = new Date("2026-03-16T00:00:00.000Z");
const PAYMENT_ENV = {
    VNP_VERSION: "2.1.0",
    VNP_TMNCODE: "TESTTMN",
    VNP_HASH_SECRET: "secret-key",
    VNP_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    VNP_RETURN_URL: "http://localhost:3000/payment/vnpay/return",
    VNP_IPN_URL: "http://localhost:3000/payment/vnpay/ipn",
    VNP_LOCALE: "vn",
    VNP_CURRENCY: "VND",
};

function createCatalogGraph() {
    const product = createProductFixture({
        _id: new ObjectId("65f000000000000000000901"),
        title: "Payment Phone",
        hasActiveVariants: true,
        hasInStockVariants: true,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });
    const firstVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000902"),
        productId: product._id,
        sku: "PAY-BLK-128",
        salePrice: 19990000,
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
    });

    return {
        product,
        firstVariant,
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
        variants: [graph.firstVariant],
        productMediaMetadata: [],
        inventoryRecords: [
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000903"),
                variantId: graph.firstVariant._id,
                stockQuantity: 5,
                lowStockThreshold: 2,
                createdAt: BASE_TIMESTAMP,
                updatedAt: BASE_TIMESTAMP,
            }),
        ],
        carts: [],
        orders: [],
        payments: [],
        accounts: [],
    };
}

function createOrderFixture({
    orderId = new ObjectId("65f000000000000000000904"),
    accountId = CUSTOMER_ACCOUNT_ID,
    orderCode = "ORD-20260316-010101",
    paymentMethod = "vnpay",
    paymentStatus = "pending",
    orderStatus = "pending",
    stockCommitStatus = paymentMethod === "cod" ? "committed" : "not_committed",
    createdAt = BASE_TIMESTAMP,
    updatedAt = BASE_TIMESTAMP,
} = {}) {
    const graph = createCatalogGraph();
    const items = [
        {
            productId: graph.product._id,
            variantId: graph.firstVariant._id,
            sku: graph.firstVariant.sku,
            productName: graph.product.title,
            variantLabel: "8GB / 128GB / Black",
            thumbnailUrl: null,
            unitPrice: graph.firstVariant.salePrice,
            quantity: 1,
            lineTotal: graph.firstVariant.salePrice,
        },
    ];

    return createOrder({
        _id: orderId,
        orderCode,
        accountId,
        phoneNumber: "0900000000",
        shippingAddressLine: "123 Payment Street",
        paymentMethod,
        paymentStatus,
        orderStatus,
        stockCommitStatus,
        items,
        subtotal: graph.firstVariant.salePrice,
        discountTotal: 0,
        shippingFee: 0,
        grandTotal: graph.firstVariant.salePrice,
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

function createPaymentFixture({
    paymentId = new ObjectId("65f000000000000000000905"),
    orderId = new ObjectId("65f000000000000000000904"),
    orderCode = "ORD-20260316-010101",
    paymentCode = "PAY-20260316-010101",
    status = "pending",
    createdAt = BASE_TIMESTAMP,
    updatedAt = BASE_TIMESTAMP,
} = {}) {
    return createPayment({
        _id: paymentId,
        paymentCode,
        orderId,
        orderCode,
        paymentMethod: "vnpay",
        provider: "vnpay",
        amount: 19990000,
        currency: "VND",
        status,
        providerTxnRef: paymentCode,
        orderInfo: "Thanh toan don hang ORD 20260316 010101",
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
                const hasPaymentCodeConflict =
                    name === "payments" &&
                    documents.some(
                        (existingDocument) =>
                            existingDocument.paymentCode === document.paymentCode ||
                            (existingDocument.providerTxnRef &&
                                existingDocument.providerTxnRef ===
                                    document.providerTxnRef)
                    );

                if (hasOrderCodeConflict || hasPaymentCodeConflict) {
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
            deleteOne: async (filter) => {
                const index = documents.findIndex((document) =>
                    matchesFilter(document, filter)
                );

                if (index === -1) {
                    return {
                        acknowledged: true,
                        deletedCount: 0,
                    };
                }

                documents.splice(index, 1);

                return {
                    acknowledged: true,
                    deletedCount: 1,
                };
            },
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

function signVnpayPayload(payload) {
    const sorted = Object.keys(payload)
        .sort()
        .reduce((result, key) => {
            result[key] = payload[key];
            return result;
        }, {});
    const signData = qs.stringify(sorted, {
        encode: true,
        format: "RFC1738",
    });
    const secureHash = crypto
        .createHmac("sha512", PAYMENT_ENV.VNP_HASH_SECRET)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

    return {
        ...sorted,
        vnp_SecureHash: secureHash,
    };
}

describe("payment http integration", () => {
    let runningServer;
    let previousEnv;

    beforeEach(() => {
        previousEnv = {};

        for (const [key, value] of Object.entries(PAYMENT_ENV)) {
            previousEnv[key] = process.env[key];
            process.env[key] = value;
        }
    });

    afterEach(async () => {
        for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) {
                delete process.env[key];
                continue;
            }

            process.env[key] = value;
        }

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

    it("creates a VNPAY payment URL by orderId for the order owner", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000906"),
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                orderId: "65f000000000000000000906",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.paymentCode).toContain("PAY-");
        expect(body.data.orderId).toBe("65f000000000000000000906");
        expect(body.data.paymentUrl).toContain("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        expect(body.data.paymentUrl).toContain(`vnp_TxnRef=${body.data.paymentCode}`);
        expect(runningServer.db.getState().get("payments")).toHaveLength(1);
    });

    it("creates a VNPAY payment URL by orderCode for a guest order", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000907"),
                accountId: null,
                orderCode: "ORD-20260316-GUEST01",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                orderCode: "ORD-20260316-GUEST01",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.orderCode).toBe("ORD-20260316-GUEST01");
        expect(body.data.paymentUrl).toContain(`vnp_TxnRef=${body.data.paymentCode}`);
    });

    it("rejects create-url when the order is not accessible to the requester", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000908"),
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: OTHER_CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                orderId: "65f000000000000000000908",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.code).toBe("PAYMENT_NOT_FOUND");
    });

    it("rejects create-url when the order does not exist", async () => {
        runningServer = await startServer(createBaseState());

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                orderId: "65f000000000000000000999",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.code).toBe("PAYMENT_NOT_FOUND");
    });

    it("rejects create-url for admin access", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000909"),
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: ADMIN_AUTH_COOKIE,
            },
            body: JSON.stringify({
                orderId: "65f000000000000000000909",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.code).toBe("PAYMENT_FORBIDDEN");
    });

    it("rejects create-url when the order payment method is cod", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000910"),
                paymentMethod: "cod",
                stockCommitStatus: "committed",
            }),
        ];
        runningServer = await startServer(state);

        const response = await fetch(`${runningServer.url}/payments/vnpay/create-url`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: CUSTOMER_AUTH_COOKIE,
            },
            body: JSON.stringify({
                orderId: "65f000000000000000000910",
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.code).toBe("PAYMENT_CONFLICT");
    });

    it("verifies Return URL without mutating the database", async () => {
        const state = createBaseState();
        state.orders = [
            createOrderFixture({
                orderId: new ObjectId("65f000000000000000000911"),
            }),
        ];
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000912"),
            orderId: new ObjectId("65f000000000000000000911"),
        });
        state.payments = [payment];
        runningServer = await startServer(state);

        const query = signVnpayPayload({
            vnp_Amount: 1999000000,
            vnp_ResponseCode: "00",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionStatus: "00",
            vnp_TxnRef: payment.paymentCode,
        });
        const params = new URLSearchParams(query);
        const response = await fetch(
            `${runningServer.url}/payment/vnpay/return?${params.toString()}`
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(runningServer.db.getState().get("payments")[0].status).toBe("pending");
    });

    it("returns an invalid checksum result for a tampered Return URL", async () => {
        runningServer = await startServer(createBaseState());

        const params = new URLSearchParams({
            vnp_TxnRef: "PAY-20260316-010101",
            vnp_ResponseCode: "00",
            vnp_TransactionStatus: "00",
            vnp_SecureHash: "invalid",
        });
        const response = await fetch(
            `${runningServer.url}/payment/vnpay/return?${params.toString()}`
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            success: false,
            code: "97",
        });
    });

    it("rejects an IPN with an invalid checksum", async () => {
        runningServer = await startServer(createBaseState());

        const params = new URLSearchParams({
            vnp_TxnRef: "PAY-20260316-010101",
            vnp_ResponseCode: "00",
            vnp_TransactionStatus: "00",
            vnp_SecureHash: "invalid",
        });
        const response = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${params.toString()}`
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            RspCode: "97",
            Message: "Fail checksum",
        });
    });

    it("applies a successful IPN exactly once and keeps retries idempotent", async () => {
        const state = createBaseState();
        const order = createOrderFixture({
            orderId: new ObjectId("65f000000000000000000913"),
        });
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000914"),
            orderId: order._id,
            orderCode: order.orderCode,
        });
        state.orders = [order];
        state.payments = [payment];
        runningServer = await startServer(state);

        const query = signVnpayPayload({
            vnp_Amount: 1999000000,
            vnp_ResponseCode: "00",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionNo: "123456",
            vnp_TransactionStatus: "00",
            vnp_TxnRef: payment.paymentCode,
        });
        const params = new URLSearchParams(query);

        const firstResponse = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${params.toString()}`
        );
        const firstBody = await firstResponse.json();
        const secondResponse = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${params.toString()}`
        );
        const secondBody = await secondResponse.json();

        expect(firstBody).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(secondBody).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(runningServer.db.getState().get("payments")[0]).toMatchObject({
            status: "paid",
            providerTransactionNo: "123456",
        });
        expect(runningServer.db.getState().get("orders")[0]).toMatchObject({
            paymentStatus: "paid",
            stockCommitStatus: "committed",
        });
        expect(runningServer.db.getState().get("inventoryRecords")[0].stockQuantity).toBe(4);
    });

    it("maps failed and cancelled VNPAY responses onto internal statuses", async () => {
        const state = createBaseState();
        const order = createOrderFixture({
            orderId: new ObjectId("65f000000000000000000915"),
        });
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000916"),
            orderId: order._id,
            orderCode: order.orderCode,
        });
        state.orders = [order];
        state.payments = [payment];
        runningServer = await startServer(state);

        const cancelledQuery = signVnpayPayload({
            vnp_ResponseCode: "24",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionStatus: "02",
            vnp_TxnRef: payment.paymentCode,
        });
        const cancelledResponse = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${new URLSearchParams(cancelledQuery).toString()}`
        );
        const cancelledBody = await cancelledResponse.json();

        expect(cancelledBody).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(runningServer.db.getState().get("payments")[0].status).toBe("cancelled");
        expect(runningServer.db.getState().get("orders")[0].paymentStatus).toBe("cancelled");
    });

    it("maps non-cancelled VNPAY failures to failed", async () => {
        const state = createBaseState();
        const order = createOrderFixture({
            orderId: new ObjectId("65f000000000000000000921"),
        });
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000922"),
            orderId: order._id,
            orderCode: order.orderCode,
        });
        state.orders = [order];
        state.payments = [payment];
        runningServer = await startServer(state);

        const failedQuery = signVnpayPayload({
            vnp_ResponseCode: "51",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionStatus: "02",
            vnp_TxnRef: payment.paymentCode,
        });
        const failedResponse = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${new URLSearchParams(failedQuery).toString()}`
        );
        const failedBody = await failedResponse.json();

        expect(failedBody).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(runningServer.db.getState().get("payments")[0].status).toBe("failed");
        expect(runningServer.db.getState().get("orders")[0].paymentStatus).toBe("failed");
    });

    it("keeps a cancelled order cancelled when a late success IPN arrives", async () => {
        const state = createBaseState();
        const order = createOrderFixture({
            orderId: new ObjectId("65f000000000000000000917"),
            paymentStatus: "cancelled",
            orderStatus: "cancelled",
            stockCommitStatus: "not_committed",
        });
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000918"),
            orderId: order._id,
            orderCode: order.orderCode,
            status: "cancelled",
        });
        state.orders = [order];
        state.payments = [payment];
        runningServer = await startServer(state);

        const successQuery = signVnpayPayload({
            vnp_ResponseCode: "00",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionStatus: "00",
            vnp_TxnRef: payment.paymentCode,
        });
        const response = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${new URLSearchParams(successQuery).toString()}`
        );
        const body = await response.json();

        expect(body).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(runningServer.db.getState().get("payments")[0].status).toBe("paid");
        expect(runningServer.db.getState().get("orders")[0]).toMatchObject({
            orderStatus: "cancelled",
            paymentStatus: "cancelled",
            stockCommitStatus: "not_committed",
        });
        expect(runningServer.db.getState().get("inventoryRecords")[0].stockQuantity).toBe(5);
    });

    it("completes a partial reconciliation when payment was already marked paid", async () => {
        const state = createBaseState();
        const order = createOrderFixture({
            orderId: new ObjectId("65f000000000000000000919"),
            paymentStatus: "pending",
            stockCommitStatus: "not_committed",
        });
        const payment = createPaymentFixture({
            paymentId: new ObjectId("65f000000000000000000920"),
            orderId: order._id,
            orderCode: order.orderCode,
            status: "paid",
        });
        state.orders = [order];
        state.payments = [payment];
        runningServer = await startServer(state);

        const successQuery = signVnpayPayload({
            vnp_ResponseCode: "00",
            vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
            vnp_TransactionStatus: "00",
            vnp_TxnRef: payment.paymentCode,
        });
        const response = await fetch(
            `${runningServer.url}/payment/vnpay/ipn?${new URLSearchParams(successQuery).toString()}`
        );
        const body = await response.json();

        expect(body).toEqual({
            RspCode: "00",
            Message: "success",
        });
        expect(runningServer.db.getState().get("orders")[0]).toMatchObject({
            paymentStatus: "paid",
            stockCommitStatus: "committed",
        });
        expect(runningServer.db.getState().get("inventoryRecords")[0].stockQuantity).toBe(4);
    });
});
