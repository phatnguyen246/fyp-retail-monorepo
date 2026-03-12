import { ObjectId } from "mongodb";
import { createCategory } from "../../models/index.js";

export const CATEGORY_SMARTPHONE_ID = "65f000000000000000000002";
export const CATEGORY_FIXTURE_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");

export function createCategoryFixture(overrides = {}) {
    return createCategory({
        _id: new ObjectId(CATEGORY_SMARTPHONE_ID),
        code: "SMARTPHONE",
        name: "Smartphone",
        createdAt: CATEGORY_FIXTURE_TIMESTAMP,
        updatedAt: CATEGORY_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}
