import { ObjectId } from "mongodb";
import { createTag } from "../../models/index.js";

export const TAG_CAMERA_PHONE_ID = "65f000000000000000000003";
export const TAG_GAMING_ID = "65f000000000000000000004";
export const TAG_BATTERY_PHONE_ID = "65f000000000000000000005";
export const TAG_FIXTURE_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");

export function createTagFixture(overrides = {}) {
    return createTag({
        _id: new ObjectId(TAG_CAMERA_PHONE_ID),
        code: "camera-phone",
        name: "Camera Phone",
        createdAt: TAG_FIXTURE_TIMESTAMP,
        updatedAt: TAG_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}
