// apps/backend/src/modules/catalog/scripts/backfillSpecsKv.js
import mongoose from "mongoose";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ProductCollection } from "../infrastructure/persistence/product.collection.js";
import { getSpecDef } from "../domain/specs/index.js";
import { normalizeMainSpecs } from "../application/helpers/normalizeMainSpecs.js";
import { buildSpecsKv } from "../application/helpers/buildSpecsKv.js";

const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 200);
const PRODUCT_TYPE = process.env.PRODUCT_TYPE?.trim();

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

    while (true) {
        const docs = await ProductCollection.find(query).limit(BATCH_SIZE).lean();
        if (!docs.length) break;

        const ops = [];
        for (const doc of docs) {
            const specDef = getSpecDef(doc.product_type);
            if (!specDef) {
                skipped += 1;
                continue;
            }
            const main_specs = normalizeMainSpecs(doc.main_specs ?? {}, specDef);
            const specs_kv = buildSpecsKv(main_specs, specDef);
            ops.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { main_specs, specs_kv } },
                },
            });
        }

        if (ops.length) {
            const result = await ProductCollection.bulkWrite(ops);
            total += result.modifiedCount ?? 0;
        }

        if (docs.length < BATCH_SIZE) break;
    }

    console.log(`Backfill done. Updated: ${total}, skipped: ${skipped}`);
    await mongoose.disconnect();
}

backfill().catch((err) => {
    console.error("Backfill failed:", err);
    mongoose.disconnect().finally(() => process.exit(1));
});
