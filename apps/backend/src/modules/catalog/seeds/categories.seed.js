import { z } from "zod";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const categorySeedSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
});

const CATEGORY_SEED_DATA = z.array(categorySeedSchema).parse([
    { code: "SMARTPHONE", name: "Smartphone" },
]);

export async function seedCategories({
    db,
    now = new Date(),
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    const timestamp = new Date(now);

    for (const category of CATEGORY_SEED_DATA) {
        await repository.upsertSeedDocument({
            collectionName: CATALOG_COLLECTIONS.categories,
            code: category.code,
            document: {
                ...category,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        });
    }
}
