import { ACCOUNT_COLLECTIONS } from "../../constants/index.js";
import { createAccountBaseRepository } from "./account-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: ACCOUNT_COLLECTIONS.accounts,
        key: { accountId: 1 },
        indexName: "accounts_account_id_unique",
    },
    {
        collectionName: ACCOUNT_COLLECTIONS.accounts,
        key: { email: 1 },
        indexName: "accounts_email_unique",
    },
];

export async function ensureAccountIndexes({
    db,
    repository = createAccountBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }
}

