import { ObjectId } from "mongodb";
import { createBrand } from "../../models/index.js";

export const BRAND_APPLE_ID = "65f000000000000000000001";
export const BRAND_FIXTURE_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");

export function createBrandFixture(overrides = {}) {
    return createBrand({
        _id: new ObjectId(BRAND_APPLE_ID),
        code: "APPLE",
        name: "Apple",
        createdAt: BRAND_FIXTURE_TIMESTAMP,
        updatedAt: BRAND_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}
