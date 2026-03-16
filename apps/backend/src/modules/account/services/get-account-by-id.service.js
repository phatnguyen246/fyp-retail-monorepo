export function createGetAccountByIdService({ accountRepository } = {}) {
    return async function getAccountById({ accountId, projection } = {}) {
        return accountRepository.findAccountByAccountId({
            accountId,
            projection,
        });
    };
}

