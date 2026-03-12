import { describe, expect, it } from "vitest";
import {
    BRAND_STATUSES,
    CATEGORY_STATUSES,
    createBrand,
    createCategory,
    createTag,
    TAG_STATUSES,
} from "../models/index.js";

describe("reference catalog models", () => {
    it("creates brand, category, and tag documents with active default status", () => {
        const brand = createBrand({ code: "APPLE", name: "Apple" });
        const category = createCategory({
            code: "SMARTPHONE",
            name: "Smartphone",
        });
        const tag = createTag({ code: "camera-phone", name: "Camera Phone" });

        expect(brand.status).toBe("active");
        expect(category.status).toBe("active");
        expect(tag.status).toBe("active");
        expect(BRAND_STATUSES).toEqual(["active", "inactive"]);
        expect(CATEGORY_STATUSES).toEqual(["active", "inactive"]);
        expect(TAG_STATUSES).toEqual(["active", "inactive"]);
    });
});
