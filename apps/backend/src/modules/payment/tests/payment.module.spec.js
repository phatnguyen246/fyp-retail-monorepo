import { describe, expect, it } from "vitest";
import { createPaymentServices } from "../services/index.js";

describe("payment module", () => {
    it("returns the payment health payload and exposes payment services", () => {
        const services = createPaymentServices();

        expect(services.getHealth()).toEqual({
            ok: true,
            module: "payment",
        });
        expect(typeof services.createVnpayPaymentUrl).toBe("function");
        expect(typeof services.handleVnpayIpn).toBe("function");
        expect(typeof services.handleVnpayReturn).toBe("function");
        expect(typeof services.reconcilePendingVnpayPayments).toBe("function");
    });
});
