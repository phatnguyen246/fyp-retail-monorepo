import { z } from "zod";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const badgeSeedSchema = z.object({
    code: z.string().min(1),
    label: z.string().min(1),
});

const BADGE_SEED_DATA = z.array(badgeSeedSchema).parse([
    { code: "new", label: "New" },
    { code: "hot", label: "Hot" },
    { code: "best_seller", label: "Best Seller" },
    { code: "installment", label: "Installment" },
]);

export async function seedBadges({
    db,
    now = new Date(),
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    const timestamp = new Date(now);

    for (const badge of BADGE_SEED_DATA) {
        await repository.upsertSeedDocument({
            collectionName: CATALOG_COLLECTIONS.badges,
            code: badge.code,
            document: {
                ...badge,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        });
    }
}
