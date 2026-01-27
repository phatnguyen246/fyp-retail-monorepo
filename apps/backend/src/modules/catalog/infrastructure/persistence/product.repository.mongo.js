import { ProductCollection } from "./product.collection.js";

export function makeProductRepositoryMongo() {
    return {
        async findById(productId) {
            return ProductCollection.findOne({ id: productId }).lean();
        },

        async findBySlug(slug) {
            return ProductCollection.findOne({ slug }).lean();
        },

        async create(product) {
            // product: { name, slug, product_type, status, main_specs, images, options, variants }
            const doc = await ProductCollection.create(product);
            return doc.toJSON();
        },

        async replaceVariants(productId, variants) {
            const doc = await ProductCollection.findOneAndUpdate(
                { id: productId },
                { $set: { variants } },
                { new: true }
            );
            return doc ? doc.toJSON() : null;
        },
    };
}
