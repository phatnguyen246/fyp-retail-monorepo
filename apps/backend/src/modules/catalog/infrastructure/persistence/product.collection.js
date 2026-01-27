import mongoose from "mongoose";
import crypto from "node:crypto";

const { Schema } = mongoose;

function uuid() {
    return crypto.randomUUID();
}

/**
 * Subdocuments
 */

// Option Value (OptionValue)
const ProductOptionValueSchema = new Schema(
    {
        id: { type: String, default: uuid },
        value_code: { type: String, required: true, trim: true }, // black, 8gb...
        value_name: { type: String, required: true, trim: true }, // Đen (Black)...
        sort_order: { type: Number, default: 0 },
        meta: { type: Schema.Types.Mixed, default: {} }, // hex_color, image_url...
    },
    { _id: false }
);

// Option (Option)
const ProductOptionSchema = new Schema(
    {
        id: { type: String, default: uuid },
        code: { type: String, required: true, trim: true }, // color, ram, storage...
        name: { type: String, required: true, trim: true }, // Màu (Color)...
        sort_order: { type: Number, default: 0 },
        values: { type: [ProductOptionValueSchema], default: [] },
    },
    { _id: false }
);

// Variant Selection (Selection)
const VariantSelectionSchema = new Schema(
    {
        option_id: { type: String, required: true },       // option.id
        option_value_id: { type: String, required: true }, // option.values.id
    },
    { _id: false }
);

// Variant (Variant / SKU)
const ProductVariantSchema = new Schema(
    {
        id: { type: String, default: uuid },
        sku: { type: String, required: true, trim: true }, // unique (global)
        is_default: { type: Boolean, default: false },
        variant_name: { type: String, default: "", trim: true },

        // Price (Money)
        price_amount: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, trim: true, default: "VND" },

        // Inventory (Stock)
        stock_on_hand: { type: Number, required: true, min: 0, default: 0 },

        // Signature for combo uniqueness check in application
        variant_signature: { type: String, required: true, trim: true },

        selections: { type: [VariantSelectionSchema], default: [] },
    },
    { _id: false }
);

/**
 * Root schema: Product
 */
const ProductSchema = new Schema(
    {
        // Domain id (uuid). Mongo _id vẫn tồn tại; bạn có thể chọn dùng id domain riêng.
        id: { type: String, default: uuid, index: true },

        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true },

        product_type: { type: String, required: true, trim: true, default: "smartphone" }, // Smartphone
        status: {
            type: String,
            required: true,
            enum: ["draft", "active", "archived"],
            default: "draft",
            index: true,
        },

        main_specs: { type: Schema.Types.Mixed, default: {} }, // JSON specs
        images: { type: [String], default: [] }, // product-level images

        options: { type: [ProductOptionSchema], default: [] },
        variants: { type: [ProductVariantSchema], default: [] },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

/**
 * Indexes
 */
// slug unique
ProductSchema.index({ slug: 1 }, { unique: true });

// sku unique globally (multikey unique index). Mỗi sku trong variants phải unique toàn bộ collection.
ProductSchema.index({ "variants.sku": 1 }, { unique: true });

// query helpers
ProductSchema.index({ product_type: 1, status: 1 });

// NOTE:
// - Không thể enforce unique "variant_signature per product" bằng unique index trong array theo đúng scope.
// - Ta sẽ enforce ở application layer (Use case).

export const ProductCollection =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);
