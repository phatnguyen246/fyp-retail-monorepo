import { PAYMENT_COLLECTIONS } from "../../constants/index.js";
import { createPaymentBaseRepository } from "./payment-base.repository.js";

export function createPaymentRepository({
    db,
    baseRepository = createPaymentBaseRepository({ db }),
} = {}) {
    return {
        createPayment({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: PAYMENT_COLLECTIONS.payments,
                document,
                options,
            });
        },

        findPaymentById({ paymentId, projection } = {}) {
            return baseRepository.findOneById({
                collectionName: PAYMENT_COLLECTIONS.payments,
                id: paymentId,
                projection,
            });
        },

        findPaymentByCode({ paymentCode, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: PAYMENT_COLLECTIONS.payments,
                fieldName: "paymentCode",
                value: paymentCode,
                projection,
            });
        },

        findPaymentByProviderTxnRef({ providerTxnRef, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: PAYMENT_COLLECTIONS.payments,
                fieldName: "providerTxnRef",
                value: providerTxnRef,
                projection,
            });
        },

        findLatestPaymentByOrderId({ orderId, projection } = {}) {
            return baseRepository
                .findManyByFilter({
                    collectionName: PAYMENT_COLLECTIONS.payments,
                    filter: {
                        orderId,
                    },
                    projection,
                    sort: {
                        createdAt: -1,
                    },
                    limit: 1,
                })
                .then((payments) => payments[0] ?? null);
        },

        findPayments({ filter = {}, projection, sort, limit } = {}) {
            return baseRepository.findManyByFilter({
                collectionName: PAYMENT_COLLECTIONS.payments,
                filter,
                projection,
                sort,
                limit,
            });
        },

        updatePaymentById({ paymentId, set, options } = {}) {
            return baseRepository.updateOneById({
                collectionName: PAYMENT_COLLECTIONS.payments,
                id: paymentId,
                set,
                options,
            });
        },

        updatePaymentByIdWithOperators({ paymentId, update, options } = {}) {
            return baseRepository.updateOneByIdWithOperators({
                collectionName: PAYMENT_COLLECTIONS.payments,
                id: paymentId,
                update,
                options,
            });
        },
    };
}
