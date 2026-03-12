import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { seedBrands } from "./brands.seed.js";
import { seedCategories } from "./categories.seed.js";
import { seedTags } from "./tags.seed.js";
import { seedBadges } from "./badges.seed.js";
import { ensureCatalogIndexes } from "./setup-catalog-indexes.js";

export async function seedCatalogBase({
    connectMongoFn = connectMongo,
    ensureCatalogIndexesFn = ensureCatalogIndexes,
    seedBrandsFn = seedBrands,
    seedCategoriesFn = seedCategories,
    seedTagsFn = seedTags,
    seedBadgesFn = seedBadges,
    logger = console,
    now = new Date(),
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensureCatalogIndexesFn({ db });
        await seedBrandsFn({ db, now });
        await seedCategoriesFn({ db, now });
        await seedTagsFn({ db, now });
        await seedBadgesFn({ db, now });

        logger.log("Catalog base data seeded successfully");
    } finally {
        await client.close();
    }
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await seedCatalogBase();
    }
}
