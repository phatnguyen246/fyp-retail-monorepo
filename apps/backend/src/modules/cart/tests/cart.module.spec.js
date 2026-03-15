import { describe, expect, it } from "vitest";
import { createCartServices } from "../services/index.js";

describe("cart module", () => {
    it("returns the cart health payload and exposes cart services", () => {
        const services = createCartServices();

        expect(services.getHealth()).toEqual({
            ok: true,
            module: "cart",
        });
        expect(typeof services.getCart).toBe("function");
        expect(typeof services.addCartItem).toBe("function");
        expect(typeof services.updateCartItem).toBe("function");
        expect(typeof services.removeCartItem).toBe("function");
        expect(typeof services.clearCart).toBe("function");
    });
});
