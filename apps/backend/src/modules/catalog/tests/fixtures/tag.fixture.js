export function createTagFixture(overrides = {}) {
    return {
        _id: "tag_camera_phone",
        code: "camera-phone",
        name: "Camera Phone",
        ...overrides,
    };
}
