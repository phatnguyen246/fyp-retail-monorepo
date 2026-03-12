export function createCategoryFixture(overrides = {}) {
    return {
        _id: "category_smartphone",
        code: "SMARTPHONE",
        name: "Smartphone",
        ...overrides,
    };
}
