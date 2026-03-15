import { describe, expect, it } from "vitest";
import { createCartValidation } from "../validation/index.js";

describe("cart validation", () => {
    it("defaults add-to-cart quantity to one", () => {
        const validation = createCartValidation();

        expect(
            validation.parseAddCartItemInput({
                variantId: "65f000000000000000000007",
            })
        ).toEqual({
            variantId: "65f000000000000000000007",
            quantity: 1,
        });
    });

    it("rejects update quantity less than one", () => {
        const validation = createCartValidation();

        expect(() =>
            validation.parseUpdateCartItemInput({
                quantity: 0,
            })
        ).toThrow();
    });
});
