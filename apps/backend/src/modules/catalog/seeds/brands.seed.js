import { z } from "zod";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const brandSeedSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
});

const BRAND_SEED_DATA = z.array(brandSeedSchema).parse([
    { code: "APPLE", name: "Apple" },
    { code: "SAMSUNG", name: "Samsung" },
    { code: "XIAOMI", name: "Xiaomi" },
    { code: "OPPO", name: "OPPO" },
    { code: "VIVO", name: "Vivo" },
]);

export async function seedBrands({
    db,
    now = new Date(),
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    const timestamp = new Date(now);

    for (const brand of BRAND_SEED_DATA) {
        await repository.upsertSeedDocument({
            collectionName: CATALOG_COLLECTIONS.brands,
            code: brand.code,
            document: {
                ...brand,
                status: "active",
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        });
    }
}
