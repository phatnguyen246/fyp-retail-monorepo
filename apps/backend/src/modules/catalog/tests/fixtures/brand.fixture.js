export function createBrandFixture(overrides = {}) {
    return {
        _id: "brand_apple",
        code: "APPLE",
        name: "Apple",
        ...overrides,
    };
}
