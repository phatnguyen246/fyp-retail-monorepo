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
        expect(typeof services.createProduct).toBe("function");
        expect(typeof services.updateProduct).toBe("function");
        expect(typeof services.getProductDetailAdmin).toBe("function");
        expect(typeof services.softDeleteProduct).toBe("function");
        expect(typeof services.createVariant).toBe("function");
        expect(typeof services.updateVariant).toBe("function");
        expect(typeof services.softDeleteVariant).toBe("function");
        expect(typeof services.uploadVariantImage).toBe("function");
        expect(typeof services.listVariantImages).toBe("function");
        expect(typeof services.deleteVariantImage).toBe("function");
    });
});
