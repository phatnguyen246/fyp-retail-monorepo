import { createAccountAdapters } from "./adapters/index.js";
import { createAccountServices } from "./services/index.js";

export function registerAccountModule({ db } = {}) {
    const adapters = createAccountAdapters({ db });
    const services = createAccountServices({ adapters });

    return {
        adapters,
        services,
    };
}
