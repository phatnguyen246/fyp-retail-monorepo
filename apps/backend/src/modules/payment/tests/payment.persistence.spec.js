import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    createPaymentBaseRepository,
    createPaymentRepository,
    ensurePaymentIndexes,
} from "../adapters/persistence/index.js";

function createCollectionMock() {
    const cursor = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
    };

    return {
        cursor,
        createIndex: vi.fn().mockResolvedValue("ok"),
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn().mockReturnValue(cursor),
        insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
}

function createDbMock(collectionMock) {
    return {
        collection: vi.fn().mockReturnValue(collectionMock),
    };
}

describe("payment persistence", () => {
    it("creates payment indexes through the base repository helpers", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);

        await ensurePaymentIndexes({ db });

        expect(collectionMock.createIndex).toHaveBeenNthCalledWith(
            1,
            { paymentCode: 1 },
            {
                unique: true,
                name: "payments_payment_code_unique",
            }
        );
        expect(collectionMock.createIndex).toHaveBeenNthCalledWith(
            2,
            { providerTxnRef: 1 },
            {
                unique: true,
                name: "payments_provider_txn_ref_unique",
                partialFilterExpression: {
                    providerTxnRef: {
                        $type: "string",
                    },
                },
            }
        );
    });

    it("normalizes payment lookups and latest-order queries in the repository", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createPaymentRepository({ db });
        const paymentId = "65f000000000000000000804";
        const orderId = new ObjectId("65f000000000000000000805");

        await repository.findPaymentById({
            paymentId,
        });
        await repository.findPaymentByCode({
            paymentCode: "PAY-20260316-000001",
        });
        await repository.findPaymentByProviderTxnRef({
            providerTxnRef: "PAY-20260316-000001",
        });
        await repository.findLatestPaymentByOrderId({
            orderId,
        });

        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            1,
            { _id: new ObjectId(paymentId) },
            undefined
        );
        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            2,
            { paymentCode: "PAY-20260316-000001" },
            undefined
        );
        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            3,
            { providerTxnRef: "PAY-20260316-000001" },
            undefined
        );
        expect(collectionMock.find).toHaveBeenCalledWith(
            { orderId },
            undefined
        );
        expect(collectionMock.cursor.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });
    });

    it("exposes shared repository helpers through createPaymentBaseRepository", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createPaymentBaseRepository({ db });

        await repository.ensureUniqueIndex({
            collectionName: "payments",
            key: { paymentCode: 1 },
            indexName: "payments_payment_code_unique",
        });
        await repository.findOneByField({
            collectionName: "payments",
            fieldName: "paymentCode",
            value: "PAY-20260316-000001",
        });

        expect(collectionMock.createIndex).toHaveBeenCalledWith(
            { paymentCode: 1 },
            {
                unique: true,
                name: "payments_payment_code_unique",
            }
        );
        expect(collectionMock.findOne).toHaveBeenCalledWith(
            { paymentCode: "PAY-20260316-000001" },
            undefined
        );
    });
});
