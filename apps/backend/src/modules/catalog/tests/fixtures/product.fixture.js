import { ObjectId } from "mongodb";
import { createProduct } from "../../models/index.js";
import { createBrandFixture } from "./brand.fixture.js";
import { createCategoryFixture } from "./category.fixture.js";
import { createTagFixture } from "./tag.fixture.js";
import { createVariantFixture } from "./variant.fixture.js";

export const PRODUCT_IPHONE_16_ID = "65f000000000000000000006";
export const PRODUCT_FIXTURE_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");

function hasOwnProperty(target, propertyName) {
    return Object.prototype.hasOwnProperty.call(target, propertyName);
}

export function createProductFixture(overrides = {}) {
    return createProduct({
        _id: new ObjectId(PRODUCT_IPHONE_16_ID),
        productGroupCode: "APPLE_IPHONE_16",
        title: "iPhone 16",
        brandId: new ObjectId("65f000000000000000000001"),
        categoryId: new ObjectId("65f000000000000000000002"),
        productType: "smartphone",
        shortDescription: "Apple smartphone",
        longDescription: "Apple smartphone long description",
        status: "active",
        contactWhenOutOfStock: false,
        tagIds: [
            new ObjectId("65f000000000000000000003"),
            new ObjectId("65f000000000000000000005"),
        ],
        badges: ["new"],
        specs: {
            chipset: "A18",
            battery: "3561mAh",
        },
        createdAt: PRODUCT_FIXTURE_TIMESTAMP,
        updatedAt: PRODUCT_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}

export function createProductReadModelFixture(overrides = {}) {
    return createProduct({
        ...createProductFixture(),
        defaultSelectedVariantId: new ObjectId("65f000000000000000000007"),
        listingVariantSnapshot: {
            variantId: new ObjectId("65f000000000000000000007"),
            sku: "IP16-BLK-128",
            color: "Black",
            ram: "8GB",
            rom: "128GB",
            salePrice: 22990000,
            originalPrice: 24990000,
            currency: "VND",
        },
        hasInStockVariants: true,
        hasActiveVariants: true,
        minSalePrice: 22990000,
        minOriginalPrice: 24990000,
        ...overrides,
    });
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
            _id: new ObjectId("65f000000000000000000004"),
            code: "gaming",
            name: "Gaming",
        },
        {
            _id: new ObjectId("65f000000000000000000005"),
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
        ...(hasOwnProperty(productOverrides, "tagIds")
            ? {}
            : { tagIds: tags.map((tag) => tag._id) }),
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
