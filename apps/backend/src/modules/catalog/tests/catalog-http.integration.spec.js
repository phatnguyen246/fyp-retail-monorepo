import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../../bootstrap/app.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { CATALOG_PRODUCT_IMPORT_FORM_FIELD } from "../constants/index.js";
import {
    createBrandFixture,
    createCategoryFixture,
    createProductFixture,
    createProductImportRowFixture,
    createProductMediaFixture,
    createProductReadModelFixture,
    createTagFixture,
    createVariantFixture,
} from "./fixtures/index.js";

function createCatalogState() {
    const appleBrand = createBrandFixture();
    const samsungBrand = createBrandFixture({
        _id: new ObjectId("65f000000000000000000011"),
        code: "SAMSUNG",
        name: "Samsung",
    });
    const category = createCategoryFixture();
    const cameraTag = createTagFixture();
    const batteryTag = createTagFixture({
        _id: new ObjectId("65f000000000000000000005"),
        code: "battery-phone",
        name: "Battery Phone",
    });
    const galaxyProduct = createProductReadModelFixture({
        _id: new ObjectId("65f000000000000000000008"),
        productGroupCode: "SAMSUNG_GALAXY_S25",
        title: "Điện thoại Samsung S25",
        slug: "dien-thoai-samsung-s25",
        searchTitle: "dien thoai samsung s25",
        brandId: samsungBrand._id,
        categoryId: category._id,
        tagIds: [cameraTag._id],
        defaultSelectedVariantId: new ObjectId("65f000000000000000000009"),
        listingVariantSnapshot: {
            variantId: new ObjectId("65f000000000000000000009"),
            sku: "S25-BLU-256",
            color: "Blue",
            ram: "12GB",
            rom: "256GB",
            salePrice: 28990000,
            originalPrice: 30990000,
            currency: "VND",
        },
        minSalePrice: 28990000,
        minOriginalPrice: 30990000,
        badges: ["hot"],
        specs: {
            chipset: "Snapdragon 8 Elite",
            battery: "5000mAh",
        },
    });
    const iphoneProduct = createProductReadModelFixture({
        tagIds: [cameraTag._id, batteryTag._id],
    });
    const hiddenDraftProduct = createProductFixture({
        _id: new ObjectId("65f000000000000000000010"),
        productGroupCode: "APPLE_IPHONE_DRAFT",
        title: "iPhone Draft",
        status: "draft",
    });
    const iphoneVariant = createVariantFixture();
    const galaxyVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000009"),
        productId: galaxyProduct._id,
        sku: "S25-BLU-256",
        variantAttributes: {
            ram: "12GB",
            rom: "256GB",
            color: "Blue",
        },
        originalPrice: 30990000,
        salePrice: 28990000,
    });
    const iphoneMedia = createProductMediaFixture();

    return {
        brands: [appleBrand, samsungBrand],
        categories: [category],
        tags: [cameraTag, batteryTag],
        badges: [],
        products: [iphoneProduct, galaxyProduct, hiddenDraftProduct],
        variants: [iphoneVariant, galaxyVariant],
        productMediaMetadata: [iphoneMedia],
        inventoryRecords: [
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000091"),
                variantId: iphoneVariant._id,
                stockQuantity: 5,
                lowStockThreshold: 3,
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            }),
            createInventoryRecord({
                _id: new ObjectId("65f000000000000000000092"),
                variantId: galaxyVariant._id,
                stockQuantity: 7,
                lowStockThreshold: 3,
                createdAt: new Date("2026-03-12T00:00:00.000Z"),
                updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            }),
        ],
    };
}

function createCatalogStateWithZeroInventory() {
    const state = createCatalogState();

    state.inventoryRecords = state.inventoryRecords.map((inventoryRecord) =>
        createInventoryRecord({
            _id: inventoryRecord._id,
            variantId: inventoryRecord.variantId,
            stockQuantity: 0,
            lowStockThreshold: inventoryRecord.lowStockThreshold,
            createdAt: inventoryRecord.createdAt,
            updatedAt: inventoryRecord.updatedAt,
        })
    );

    return state;
}

function createCatalogStateWithDetailLiveMismatch() {
    const state = createCatalogState();

    state.variants[0] = {
        ...state.variants[0],
        isInStock: false,
    };

    return state;
}

function createCatalogStateWithCompareLiveMismatch() {
    const state = createCatalogState();
    const secondIphoneVariant = createVariantFixture({
        _id: new ObjectId("65f000000000000000000093"),
        productId: new ObjectId("65f000000000000000000006"),
        sku: "IP16-BLU-256",
        variantAttributes: {
            ram: "8GB",
            rom: "256GB",
            color: "Blue",
        },
        originalPrice: 26990000,
        salePrice: 24990000,
        isInStock: false,
    });

    state.variants = [
        {
            ...state.variants[0],
            isInStock: true,
        },
        secondIphoneVariant,
        ...state.variants.slice(1),
    ];
    state.inventoryRecords = [
        createInventoryRecord({
            _id: new ObjectId("65f000000000000000000094"),
            variantId: state.variants[0]._id,
            stockQuantity: 0,
            lowStockThreshold: 3,
            createdAt: new Date("2026-03-12T00:00:00.000Z"),
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
        }),
        createInventoryRecord({
            _id: new ObjectId("65f000000000000000000095"),
            variantId: secondIphoneVariant._id,
            stockQuantity: 4,
            lowStockThreshold: 3,
            createdAt: new Date("2026-03-12T00:00:00.000Z"),
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
        }),
        state.inventoryRecords[1],
    ];

    return state;
}

function createInMemoryDb(seedState = createCatalogState(), options = {}) {
    const collections = new Map(
        Object.entries(seedState).map(([name, documents]) => [name, [...documents]])
    );

    function getCollection(name) {
        if (!collections.has(name)) {
            collections.set(name, []);
        }

        const documents = collections.get(name);
        const shouldFailInventoryReads =
            options.failInventoryReads === true && name === "inventoryRecords";

        return {
            createIndex: async () => "ok",
            insertOne: async (document) => {
                documents.push(document);

                return {
                    acknowledged: true,
                    insertedId: document._id,
                };
            },
            findOne: async (filter, _options) => {
                if (shouldFailInventoryReads) {
                    throw new Error("Inventory read unavailable");
                }

                return documents.find((document) => matchesFilter(document, filter)) ?? null;
            },
            find: (filter = {}, _options) => {
                if (shouldFailInventoryReads) {
                    throw new Error("Inventory read unavailable");
                }

                return createCursor(documents, filter);
            },
            updateOne: async (filter, update, options = {}) => {
                const index = documents.findIndex((document) =>
                    matchesFilter(document, filter)
                );

                if (index === -1) {
                    if (options.upsert) {
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

                    return {
                        acknowledged: true,
                        matchedCount: 0,
                        modifiedCount: 0,
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
            deleteOne: async (filter) => {
                const index = documents.findIndex((document) =>
                    matchesFilter(document, filter)
                );

                if (index === -1) {
                    return {
                        deletedCount: 0,
                    };
                }

                documents.splice(index, 1);

                return {
                    deletedCount: 1,
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
    let skipCount = 0;
    let limitCount = null;

    return {
        sort(config) {
            sortConfig = config;

            return this;
        },
        skip(value) {
            skipCount = value;

            return this;
        },
        limit(value) {
            limitCount = value;

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

            if (skipCount > 0) {
                results = results.slice(skipCount);
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

            if ("$gte" in condition || "$lte" in condition) {
                const meetsMin =
                    !("$gte" in condition) || normalizeComparable(value) >= condition.$gte;
                const meetsMax =
                    !("$lte" in condition) || normalizeComparable(value) <= condition.$lte;

                return meetsMin && meetsMax;
            }

            if ("$ne" in condition) {
                return !isEqualValue(value, condition.$ne);
            }

            if ("$regex" in condition) {
                const regex = new RegExp(condition.$regex, condition.$options ?? "");

                return typeof value === "string" ? regex.test(value) : false;
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

function buildCsv(rows) {
    const headers = Object.keys(rows[0]);

    return [
        headers.join(","),
        ...rows.map((row) =>
            headers.map((header) => escapeCsvValue(row[header])).join(",")
        ),
    ].join("\n");
}

function escapeCsvValue(value) {
    const stringValue = String(value ?? "");

    if (stringValue.includes(",") || stringValue.includes('"')) {
        return `"${stringValue.replaceAll('"', '""')}"`;
    }

    return stringValue;
}

async function startServer(seedState, options = {}) {
    const db = createInMemoryDb(seedState, options);
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

describe("catalog http integration", () => {
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

    it("supports admin create and update product with wrapped story responses", async () => {
        runningServer = await startServer(createCatalogState());

        const createResponse = await fetch(
            `${runningServer.url}/admin/catalog/products`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productGroupCode: "APPLE_IPHONE_17",
                    title: "iPhone 17",
                    brandCode: "APPLE",
                    categoryCode: "SMARTPHONE",
                    tagCodes: ["camera-phone"],
                    specs: {
                        chipset: "A19",
                    },
                }),
            }
        );
        const createdBody = await createResponse.json();

        expect(createResponse.status).toBe(201);
        expect(createdBody.data).toMatchObject({
            productGroupCode: "APPLE_IPHONE_17",
            title: "iPhone 17",
            status: "draft",
        });

        const updateResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/65f000000000000000000006`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    title: "iPhone 16 Ultra",
                }),
            }
        );
        const updatedBody = await updateResponse.json();

        expect(updateResponse.status).toBe(200);
        expect(updatedBody.data).toMatchObject({
            title: "iPhone 16 Ultra",
            searchTitle: "iphone 16 ultra",
        });
    });

    it("returns validation and not-found errors for admin story routes", async () => {
        runningServer = await startServer(createCatalogState());

        const validationResponse = await fetch(
            `${runningServer.url}/admin/catalog/products`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productGroupCode: "APPLE_IPHONE_18",
                    title: "   ",
                    brandCode: "APPLE",
                    categoryCode: "SMARTPHONE",
                    specs: {},
                }),
            }
        );
        const validationBody = await validationResponse.json();

        expect(validationResponse.status).toBe(422);
        expect(validationBody.code).toBe("VALIDATION_ERROR");

        const notFoundResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/65f000000000000000000099`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    title: "Missing Product",
                }),
            }
        );
        const notFoundBody = await notFoundResponse.json();

        expect(notFoundResponse.status).toBe(404);
        expect(notFoundBody.code).toBe("CATALOG_NOT_FOUND");
    });

    it("imports catalog products from CSV and rejects malformed import input", async () => {
        runningServer = await startServer(createCatalogState());

        const csvContent = buildCsv([
            createProductImportRowFixture({
                productGroupCode: "XIAOMI_15",
                title: "Xiaomi 15",
                brandCode: "SAMSUNG",
                categoryCode: "SMARTPHONE",
                sku: "X15-BLK-256",
                productStatus: "active",
            }),
        ]);
        const formData = new FormData();

        formData.set(
            CATALOG_PRODUCT_IMPORT_FORM_FIELD,
            new Blob([csvContent], {
                type: "text/csv",
            }),
            "catalog.csv"
        );

        const importResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/import`,
            {
                method: "POST",
                body: formData,
            }
        );
        const importBody = await importResponse.json();

        expect(importResponse.status).toBe(201);
        expect(importBody.data.products).toEqual([
            expect.objectContaining({
                productGroupCode: "XIAOMI_15",
            }),
        ]);
        expect(importBody.meta).toMatchObject({
            rowCount: 1,
            productCount: 1,
            variantCount: 1,
        });

        const products = runningServer.db.getState().get("products");
        const importedProduct = products.find(
            (product) => product.productGroupCode === "XIAOMI_15"
        );

        expect(importedProduct.status).toBe("draft");

        const invalidFormData = new FormData();

        invalidFormData.set(
            CATALOG_PRODUCT_IMPORT_FORM_FIELD,
            new Blob(["title\n"], {
                type: "text/plain",
            }),
            "catalog.txt"
        );

        const invalidResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/import`,
            {
                method: "POST",
                body: invalidFormData,
            }
        );
        const invalidBody = await invalidResponse.json();

        expect(invalidResponse.status).toBe(422);
        expect(invalidBody.code).toBe("VALIDATION_ERROR");
    });

    it("clones a product as draft and rejects duplicate productGroupCode", async () => {
        runningServer = await startServer(createCatalogState());

        const cloneResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/65f000000000000000000006/clone`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productGroupCode: "APPLE_IPHONE_16_COPY",
                    title: "iPhone 16 Copy",
                }),
            }
        );
        const cloneBody = await cloneResponse.json();

        expect(cloneResponse.status).toBe(201);
        expect(cloneBody.data).toMatchObject({
            productGroupCode: "APPLE_IPHONE_16_COPY",
            title: "iPhone 16 Copy",
            status: "draft",
        });

        const duplicateCloneResponse = await fetch(
            `${runningServer.url}/admin/catalog/products/65f000000000000000000006/clone`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productGroupCode: "APPLE_IPHONE_16",
                }),
            }
        );
        const duplicateCloneBody = await duplicateCloneResponse.json();

        expect(duplicateCloneResponse.status).toBe(409);
        expect(duplicateCloneBody.code).toBe("CATALOG_CONFLICT");
    });

    it("lists and searches storefront products with paging meta", async () => {
        runningServer = await startServer(createCatalogState());

        const listResponse = await fetch(
            `${runningServer.url}/catalog/products?brand=APPLE&page=1&limit=10`
        );
        const listBody = await listResponse.json();

        expect(listResponse.status).toBe(200);
        expect(listBody.data).toHaveLength(1);
        expect(listBody.data[0]).toMatchObject({
            title: "iPhone 16",
            brand: {
                code: "APPLE",
            },
        });
        expect(listBody.meta).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
        });

        const searchResponse = await fetch(
            `${runningServer.url}/catalog/search?q=điện thoại samsung`
        );
        const searchBody = await searchResponse.json();

        expect(searchResponse.status).toBe(200);
        expect(searchBody.data).toHaveLength(1);
        expect(searchBody.data[0].slug).toBe("dien-thoai-samsung-s25");

        const invalidSearchResponse = await fetch(
            `${runningServer.url}/catalog/search`
        );
        const invalidSearchBody = await invalidSearchResponse.json();

        expect(invalidSearchResponse.status).toBe(422);
        expect(invalidSearchBody.code).toBe("VALIDATION_ERROR");
    });

    it("derives storefront list and search stock live from inventory instead of catalog denormalized fields", async () => {
        runningServer = await startServer(createCatalogStateWithZeroInventory());

        const listResponse = await fetch(
            `${runningServer.url}/catalog/products?brand=APPLE&page=1&limit=10`
        );
        const listBody = await listResponse.json();
        const searchResponse = await fetch(
            `${runningServer.url}/catalog/search?q=điện thoại samsung`
        );
        const searchBody = await searchResponse.json();

        expect(listResponse.status).toBe(200);
        expect(listBody.data[0].hasInStockVariants).toBe(false);
        expect(searchResponse.status).toBe(200);
        expect(searchBody.data[0].hasInStockVariants).toBe(false);
    });

    it("returns storefront product detail and compare responses with canonical slug meta", async () => {
        runningServer = await startServer(createCatalogState());

        const detailResponse = await fetch(
            `${runningServer.url}/catalog/products/65f000000000000000000006/wrong-slug`
        );
        const detailBody = await detailResponse.json();

        expect(detailResponse.status).toBe(200);
        expect(detailBody.data).toMatchObject({
            id: "65f000000000000000000006",
            title: "iPhone 16",
            defaultSelectedVariantId: "65f000000000000000000007",
        });
        expect(detailBody.data.defaultVariant).toMatchObject({
            sku: "IP16-BLK-128",
        });
        expect(detailBody.data.variants[0].media).toHaveLength(1);
        expect(detailBody.meta).toEqual({
            canonicalSlug: "iphone-16",
        });

        const missingDetailResponse = await fetch(
            `${runningServer.url}/catalog/products/65f000000000000000000010/iphone-draft`
        );
        const missingDetailBody = await missingDetailResponse.json();

        expect(missingDetailResponse.status).toBe(404);
        expect(missingDetailBody.code).toBe("CATALOG_NOT_FOUND");

        const compareResponse = await fetch(
            `${runningServer.url}/catalog/compare`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productIds: [
                        "65f000000000000000000006",
                        "65f000000000000000000008",
                    ],
                }),
            }
        );
        const compareBody = await compareResponse.json();

        expect(compareResponse.status).toBe(200);
        expect(compareBody.data.items).toHaveLength(2);
        expect(compareBody.data.items[0]).toMatchObject({
            product: {
                title: "iPhone 16",
            },
            defaultVariant: {
                sku: "IP16-BLK-128",
            },
        });

        const invalidCompareResponse = await fetch(
            `${runningServer.url}/catalog/compare`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productIds: [
                        "65f000000000000000000006",
                        "65f000000000000000000008",
                        "65f000000000000000000010",
                        "65f000000000000000000099",
                    ],
                }),
            }
        );
        const invalidCompareBody = await invalidCompareResponse.json();

        expect(invalidCompareResponse.status).toBe(422);
        expect(invalidCompareBody.code).toBe("VALIDATION_ERROR");

        const missingCompareResponse = await fetch(
            `${runningServer.url}/catalog/compare`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productIds: [
                        "65f000000000000000000006",
                        "65f000000000000000000099",
                    ],
                }),
            }
        );
        const missingCompareBody = await missingCompareResponse.json();

        expect(missingCompareResponse.status).toBe(404);
        expect(missingCompareBody.code).toBe("CATALOG_NOT_FOUND");
    });

    it("hydrates storefront detail and compare stock from live inventory", async () => {
        runningServer = await startServer(createCatalogStateWithDetailLiveMismatch());

        const detailResponse = await fetch(
            `${runningServer.url}/catalog/products/65f000000000000000000006/iphone-16`
        );
        const detailBody = await detailResponse.json();

        expect(detailResponse.status).toBe(200);
        expect(detailBody.data.defaultVariant).toMatchObject({
            sku: "IP16-BLK-128",
            isInStock: true,
        });
        expect(detailBody.data.variants[0].isInStock).toBe(true);

        await new Promise((resolve) => {
            runningServer.server.close(resolve);
        });
        runningServer = await startServer(createCatalogStateWithCompareLiveMismatch());

        const compareResponse = await fetch(
            `${runningServer.url}/catalog/compare`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    productIds: [
                        "65f000000000000000000006",
                        "65f000000000000000000008",
                    ],
                }),
            }
        );
        const compareBody = await compareResponse.json();

        expect(compareResponse.status).toBe(200);
        expect(compareBody.data.items[0]).toMatchObject({
            product: {
                defaultSelectedVariantId: "65f000000000000000000093",
            },
            defaultVariant: {
                sku: "IP16-BLU-256",
                isInStock: true,
            },
        });
    });

    it("falls back to out-of-stock when inventory reads fail but storefront responses stay successful", async () => {
        runningServer = await startServer(createCatalogState(), {
            failInventoryReads: true,
        });

        const [listResponse, detailResponse, searchResponse, compareResponse] =
            await Promise.all([
                fetch(
                    `${runningServer.url}/catalog/products?brand=APPLE&page=1&limit=10`
                ),
                fetch(
                    `${runningServer.url}/catalog/products/65f000000000000000000006/iphone-16`
                ),
                fetch(`${runningServer.url}/catalog/search?q=điện thoại samsung`),
                fetch(`${runningServer.url}/catalog/compare`, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        productIds: [
                            "65f000000000000000000006",
                            "65f000000000000000000008",
                        ],
                    }),
                }),
            ]);
        const listBody = await listResponse.json();
        const detailBody = await detailResponse.json();
        const searchBody = await searchResponse.json();
        const compareBody = await compareResponse.json();

        expect(listResponse.status).toBe(200);
        expect(listBody.data[0].hasInStockVariants).toBe(false);
        expect(detailResponse.status).toBe(200);
        expect(detailBody.data.defaultVariant.isInStock).toBe(false);
        expect(detailBody.data.variants.every((variant) => variant.isInStock === false)).toBe(
            true
        );
        expect(searchResponse.status).toBe(200);
        expect(searchBody.data[0].hasInStockVariants).toBe(false);
        expect(compareResponse.status).toBe(200);
        expect(compareBody.data.items[0].defaultVariant.isInStock).toBe(false);
    });
});
