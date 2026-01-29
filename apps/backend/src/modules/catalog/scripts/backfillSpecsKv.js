// apps/backend/src/modules/catalog/scripts/backfillSpecsKv.js
import mongoose from "mongoose";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ProductCollection } from "../infrastructure/persistence/product.collection.js";
import { getSpecDef } from "../domain/specs/index.js";
import { normalizeMainSpecs } from "../application/helpers/normalizeMainSpecs.js";
import { buildSpecsKv } from "../application/helpers/buildSpecsKv.js";

const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 200);
const PRODUCT_TYPE = process.env.PRODUCT_TYPE?.trim();
const DRY_RUN = String(process.env.DRY_RUN ?? "").trim().toLowerCase() === "true"
    || String(process.env.DRY_RUN ?? "").trim() === "1";

async function backfill() {
    await connectMongo();

    const query = {
        $or: [
            { specs_kv: { $exists: false } },
            { specs_kv: { $size: 0 } },
        ],
    };

    if (PRODUCT_TYPE) {
        query.product_type = PRODUCT_TYPE;
    }

    let total = 0;
    let skipped = 0;
    let lastId = null;

    while (true) {
        const pageQuery = { ...query };
        if (lastId) {
            pageQuery._id = { $gt: lastId };
        }

        const docs = await ProductCollection.find(pageQuery)
            .sort({ _id: 1 })
            .limit(BATCH_SIZE)
            .lean();
        if (!docs.length) break;

        const ops = [];
        for (const doc of docs) {
            const specDef = getSpecDef(doc.product_type);
            if (!specDef) {
                skipped += 1;
                continue;
            }
            const main_specs = normalizeMainSpecs(doc.main_specs ?? {}, specDef);
            const specs_kv = buildSpecsKv(
                {
                    main_specs,
                    options: doc.options ?? [],
                    variants: doc.variants ?? [],
                    price_amount: doc.price_amount,
                },
                specDef
            );
            ops.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { main_specs, specs_kv } },
                },
            });
        }

        if (ops.length) {
            if (DRY_RUN) {
                total += ops.length;
            } else {
                const result = await ProductCollection.bulkWrite(ops);
                total += result.modifiedCount ?? 0;
            }
        }

        lastId = docs[docs.length - 1]?._id ?? lastId;
        if (docs.length < BATCH_SIZE) break;
    }

    const label = DRY_RUN ? "Matched" : "Updated";
    console.log(`Backfill done. ${label}: ${total}, skipped: ${skipped}`);
    await mongoose.disconnect();
}

backfill().catch((err) => {
    console.error("Backfill failed:", err);
    mongoose.disconnect().finally(() => process.exit(1));
});
