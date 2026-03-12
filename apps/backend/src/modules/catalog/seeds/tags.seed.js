import { z } from "zod";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const tagSeedSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
});

const TAG_SEED_DATA = z.array(tagSeedSchema).parse([
    { code: "gaming", name: "Gaming" },
    { code: "camera-phone", name: "Camera Phone" },
    { code: "battery-phone", name: "Battery Phone" },
    { code: "flagship", name: "Flagship" },
    { code: "budget", name: "Budget" },
]);

export async function seedTags({
    db,
    now = new Date(),
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    const timestamp = new Date(now);

    for (const tag of TAG_SEED_DATA) {
        await repository.upsertSeedDocument({
            collectionName: CATALOG_COLLECTIONS.tags,
            code: tag.code,
            document: {
                ...tag,
                status: "active",
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        });
    }
}
