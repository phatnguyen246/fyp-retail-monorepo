export function createVariantFixture(overrides = {}) {
    return {
        _id: "variant_iphone_16_black_128",
        productId: "product_iphone_16",
        sku: "IP16-BLK-128",
        variantAttributes: {
            ram: "8GB",
            rom: "128GB",
            color: "Black",
        },
        originalPrice: 24990000,
        salePrice: 22990000,
        currency: "VND",
        status: "active",
        isInStock: true,
        ...overrides,
    };
}
