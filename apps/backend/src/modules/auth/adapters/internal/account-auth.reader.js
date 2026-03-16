export function createAccountAuthReader({ accountServices } = {}) {
    return {
        findAccountById({ accountId }) {
            return accountServices.getAccountById({ accountId });
        },

        findAccountByEmail({ email }) {
            return accountServices.getAccountByEmail({ email });
        },

        createCustomerAccount({ email, passwordHash }) {
            return accountServices.createAccount({
                input: {
                    email,
                    passwordHash,
                    role: "customer",
                },
            });
        },
    };
}

