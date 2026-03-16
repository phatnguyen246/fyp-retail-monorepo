export function createGetAccountByEmailService({
    accountRepository,
    validation,
} = {}) {
    return async function getAccountByEmail({ email, projection } = {}) {
        const normalizedEmail =
            validation.normalizers.normalizeEmailInput(email);

        if (typeof normalizedEmail !== "string") {
            return null;
        }

        return accountRepository.findAccountByEmail({
            email: normalizedEmail,
            projection,
        });
    };
}

