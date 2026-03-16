import { describe, expect, it } from "vitest";
import { createOrderingServices } from "../services/index.js";

describe("ordering module", () => {
    it("returns the ordering health payload and exposes ordering services", () => {
        const services = createOrderingServices();

        expect(services.getHealth()).toEqual({
            ok: true,
            module: "ordering",
        });
        expect(typeof services.createOrder).toBe("function");
        expect(typeof services.listCustomerOrders).toBe("function");
        expect(typeof services.getOrderDetail).toBe("function");
        expect(typeof services.cancelCustomerOrder).toBe("function");
        expect(typeof services.listAdminOrders).toBe("function");
        expect(typeof services.getAdminOrderDetail).toBe("function");
        expect(typeof services.updateAdminOrderStatus).toBe("function");
        expect(typeof services.cancelAdminOrder).toBe("function");
    });
});
