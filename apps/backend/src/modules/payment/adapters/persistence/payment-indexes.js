import { PAYMENT_COLLECTIONS } from "../../constants/index.js";
import { createPaymentBaseRepository } from "./payment-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: PAYMENT_COLLECTIONS.payments,
        key: { paymentCode: 1 },
        indexName: "payments_payment_code_unique",
    },
    {
        collectionName: PAYMENT_COLLECTIONS.payments,
        key: { providerTxnRef: 1 },
        indexName: "payments_provider_txn_ref_unique",
        partialFilterExpression: {
            providerTxnRef: {
                $type: "string",
            },
        },
    },
];

const NON_UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: PAYMENT_COLLECTIONS.payments,
        key: { orderId: 1 },
        indexName: "payments_order_id",
    },
    {
        collectionName: PAYMENT_COLLECTIONS.payments,
        key: { status: 1 },
        indexName: "payments_status",
    },
    {
        collectionName: PAYMENT_COLLECTIONS.payments,
        key: { createdAt: -1 },
        indexName: "payments_created_at_desc",
    },
];

export async function ensurePaymentIndexes({
    db,
    repository = createPaymentBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }

    for (const definition of NON_UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureIndex(definition);
    }
}
