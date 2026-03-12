import { createBrandFixture } from "./brand.fixture.js";
import { createCategoryFixture } from "./category.fixture.js";
import { createTagFixture } from "./tag.fixture.js";
import { createVariantFixture } from "./variant.fixture.js";

function hasOwnProperty(target, propertyName) {
    return Object.prototype.hasOwnProperty.call(target, propertyName);
}

export function createProductFixture(overrides = {}) {
    return {
        _id: "product_iphone_16",
        productGroupCode: "APPLE_IPHONE_16",
        title: "iPhone 16",
        brandId: "brand_apple",
        categoryId: "category_smartphone",
        productType: "smartphone",
        status: "active",
        contactWhenOutOfStock: false,
        tags: ["camera-phone", "battery-phone"],
        badges: ["new"],
        specs: {
            chipset: "A18",
            battery: "3561mAh",
        },
        ...overrides,
    };
}

export function createProductReadModelFixture(overrides = {}) {
    return {
        ...createProductFixture(),
        listingVariantSnapshot: {
            variantId: "variant_iphone_16_black_128",
            sku: "IP16-BLK-128",
            color: "Black",
            ram: "8GB",
            rom: "128GB",
            salePrice: 22990000,
            originalPrice: 24990000,
            currency: "VND",
        },
        defaultSelectedVariantId: "variant_iphone_16_black_128",
        hasInStockVariants: true,
        hasActiveVariants: true,
        minSalePrice: 22990000,
        minOriginalPrice: 24990000,
        ...overrides,
    };
}

export function createCatalogProductGraphFixture({
    brandOverrides = {},
    categoryOverrides = {},
    tagOverridesList = [],
    productOverrides = {},
    variantOverridesList = [],
} = {}) {
    const brand = createBrandFixture(brandOverrides);
    const category = createCategoryFixture(categoryOverrides);

    const defaultTagOverridesList = [
        {},
        {
            _id: "tag_gaming",
            code: "gaming",
            name: "Gaming",
        },
        {
            _id: "tag_battery_phone",
            code: "battery-phone",
            name: "Battery Phone",
        },
    ];

    const tags = (
        tagOverridesList.length > 0 ? tagOverridesList : defaultTagOverridesList
    ).map((tagOverrides) => createTagFixture(tagOverrides));

    const product = createProductFixture({
        ...(hasOwnProperty(productOverrides, "brandId")
            ? {}
            : { brandId: brand._id }),
        ...(hasOwnProperty(productOverrides, "categoryId")
            ? {}
            : { categoryId: category._id }),
        ...(hasOwnProperty(productOverrides, "tags")
            ? {}
            : { tags: tags.map((tag) => tag.code) }),
        ...productOverrides,
    });

    const variants = (
        variantOverridesList.length > 0 ? variantOverridesList : [{}]
    ).map((variantOverrides) =>
        createVariantFixture({
            ...(hasOwnProperty(variantOverrides, "productId")
                ? {}
                : { productId: product._id }),
            ...variantOverrides,
        })
    );

    return {
        brand,
        category,
        tags,
        product,
        variants,
    };
}
