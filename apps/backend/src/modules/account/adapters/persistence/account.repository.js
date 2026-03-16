import { ACCOUNT_COLLECTIONS } from "../../constants/index.js";

export function createAccountRepository({
    db,
    baseRepository,
} = {}) {
    void db;

    return {
        findAccountByAccountId({ accountId, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: ACCOUNT_COLLECTIONS.accounts,
                fieldName: "accountId",
                value: accountId,
                projection,
            });
        },

        findAccountByEmail({ email, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: ACCOUNT_COLLECTIONS.accounts,
                fieldName: "email",
                value: email,
                projection,
            });
        },

        createAccount({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: ACCOUNT_COLLECTIONS.accounts,
                document,
                options,
            });
        },
    };
}

