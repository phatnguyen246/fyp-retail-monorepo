import { registerAccountModule } from "../modules/account/index.js";
import { registerAdminOverviewModule } from "../modules/admin-overview/index.js";
import { registerAuthModule } from "../modules/auth/index.js";
import { createCartAdapters } from "../modules/cart/adapters/index.js";
import { registerCartModule } from "../modules/cart/index.js";
import { createCartServices } from "../modules/cart/services/index.js";
import { registerCatalogModule } from "../modules/catalog/index.js";
import { registerInventoryModule } from "../modules/inventory/index.js";
import { registerOrderingModule } from "../modules/ordering/api/register.js";
import { registerPaymentModule } from "../modules/payment/index.js";

export function registerModules({ app, db, storage }) {
    const account = registerAccountModule({ db });
    const cartAdapters = createCartAdapters({ db });
    const cartServices = createCartServices({
        adapters: cartAdapters,
    });
    const auth = registerAuthModule({
        app,
        accountServices: account.services,
        cartServices,
    });

    app.use(auth.middlewares.optionalAuth);

    const cart = registerCartModule({
        app,
        db,
        adapters: cartAdapters,
        services: cartServices,
    });
    const catalog = registerCatalogModule({
        app,
        db,
        storage,
        adminMiddleware: auth.middlewares.requireAdmin,
    });
    const inventory = registerInventoryModule({
        app,
        db,
        adminMiddleware: auth.middlewares.requireAdmin,
    });
    const payment = registerPaymentModule({
        app,
        adminMiddleware: auth.middlewares.requireAdmin,
        db,
    });
    const adminOverview = registerAdminOverviewModule({
        app,
        db,
        adminMiddleware: auth.middlewares.requireAdmin,
    });
    const ordering = registerOrderingModule({
        app,
        db,
        cartOrderReader: cartAdapters?.internal?.orderReader,
        paymentCheckoutAdapter: payment?.adapters?.checkout,
        requireAuthMiddleware: auth.middlewares.requireAuth,
        adminMiddleware: auth.middlewares.requireAdmin,
    });

    return {
        account,
        auth,
        cart,
        catalog,
        inventory,
        adminOverview,
        payment,
        ordering,
    };
}
