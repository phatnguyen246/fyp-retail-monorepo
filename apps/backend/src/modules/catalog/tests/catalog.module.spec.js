import { describe, expect, it } from "vitest";
import { createCatalogServices } from "../services/index.js";

describe("catalog module", () => {
    it("returns the catalog health payload", () => {
        const services = createCatalogServices();

        expect(services.getHealth()).toEqual({
            ok: true,
            module: "catalog",
        });
        expect(typeof services.rebuildProductDerivedFields).toBe("function");
    });
});
