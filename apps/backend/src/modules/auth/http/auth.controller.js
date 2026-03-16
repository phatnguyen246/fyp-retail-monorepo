import { CART_GUEST_COOKIE_NAME } from "../../cart/constants/index.js";

export function createAuthController({
    services,
    cookieService,
} = {}) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async register(req, res) {
            const result = await services.register({
                input: req.body,
                guestId:
                    typeof req?.cookies?.[CART_GUEST_COOKIE_NAME] === "string"
                        ? req.cookies[CART_GUEST_COOKIE_NAME]
                        : null,
            });

            cookieService.setAccessTokenCookie(res, result.accessToken);

            return res.status(201).json({
                data: result.currentUser,
            });
        },

        async login(req, res) {
            const result = await services.login({
                input: req.body,
            });

            cookieService.setAccessTokenCookie(res, result.accessToken);

            return res.status(200).json({
                data: result.currentUser,
            });
        },

        async logout(_req, res) {
            await services.logout();
            cookieService.clearAccessTokenCookie(res);

            return res.status(200).json({
                data: {
                    success: true,
                },
            });
        },

        async getCurrentUser(req, res) {
            const currentUser = await services.getCurrentUser({
                accountId: req.accountId,
            });

            return res.status(200).json({
                data: currentUser,
            });
        },
    };
}

