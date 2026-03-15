import { describe, expect, it } from "vitest";
import { createInventoryServices } from "../services/index.js";

describe("inventory module", () => {
    it("returns the inventory health payload and exposes module services", () => {
        const services = createInventoryServices();

        expect(services.getHealth()).toEqual({
            ok: true,
            module: "inventory",
        });
        expect(typeof services.createInventoryRecord).toBe("function");
        expect(typeof services.updateInventoryRecord).toBe("function");
        expect(typeof services.getInventoryRecord).toBe("function");
        expect(typeof services.readInventoryByVariantId).toBe("function");
        expect(typeof services.readInventoryByVariantIds).toBe("function");
        expect(typeof services.listLowStockInventory).toBe("function");
    });
});
