const ALLOWED_PRODUCT_MEDIA_MIME_TYPES = Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const PRODUCT_MEDIA_METADATA_SHAPE = Object.freeze({
    _id: {
        type: "string",
        required: false,
        description: "MongoDB document identifier for image metadata only.",
    },
    productId: {
        type: "string",
        required: true,
        description: "Required product reference for the owning catalog item.",
    },
    variantId: {
        type: "string",
        required: true,
        description: "Required variant reference because images are attached at variant level.",
    },
    url: {
        type: "string",
        required: true,
        description: "Resolvable access URL of an already uploaded image file.",
    },
    storagePath: {
        type: "string",
        required: true,
        description: "Bucket object path used for traceability and future deletion.",
    },
    fileName: {
        type: "string",
        required: true,
        description: "Stored file name in Firebase Storage.",
    },
    mimeType: {
        type: "string",
        required: true,
        enum: ALLOWED_PRODUCT_MEDIA_MIME_TYPES,
        description: "Image MIME type. Binary content is stored outside MongoDB.",
    },
    size: {
        type: "number",
        required: true,
        description: "Image file size in bytes.",
    },
    sortOrder: {
        type: "number",
        required: false,
        default: 0,
        description: "Optional display order for variant galleries.",
    },
    createdAt: {
        type: "date",
        required: true,
        description: "Metadata creation timestamp.",
    },
    updatedAt: {
        type: "date",
        required: false,
        description: "Metadata update timestamp.",
    },
});

export const PRODUCT_MEDIA_BINARY_FIELDS = Object.freeze([
    "binary",
    "buffer",
    "base64",
    "data",
]);

export function createProductMediaMetadata({
    _id,
    productId,
    variantId,
    url,
    storagePath,
    fileName,
    mimeType,
    size,
    sortOrder = 0,
    createdAt = new Date(),
    updatedAt,
} = {}) {
    assertRequiredString(productId, "productId");
    assertRequiredString(variantId, "variantId");
    assertRequiredString(url, "url");
    assertRequiredString(storagePath, "storagePath");
    assertRequiredString(fileName, "fileName");
    assertAllowedMimeType(mimeType);
    assertFileSize(size);
    assertSortOrder(sortOrder);

    const mediaDocument = {
        productId,
        variantId,
        url,
        storagePath,
        fileName,
        mimeType,
        size,
        sortOrder,
        createdAt: normalizeDate(createdAt, "createdAt"),
    };

    if (_id !== undefined) {
        mediaDocument._id = _id;
    }

    if (updatedAt !== undefined) {
        mediaDocument.updatedAt = normalizeDate(updatedAt, "updatedAt");
    }

    return mediaDocument;
}

function assertRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Catalog media metadata requires a non-empty ${fieldName}`);
    }
}

function assertAllowedMimeType(value) {
    assertRequiredString(value, "mimeType");

    if (!ALLOWED_PRODUCT_MEDIA_MIME_TYPES.includes(value)) {
        throw new Error(
            `Catalog media metadata mimeType must be one of: ${ALLOWED_PRODUCT_MEDIA_MIME_TYPES.join(", ")}`
        );
    }
}

function assertFileSize(value) {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(
            "Catalog media metadata requires size to be a non-negative integer byte count"
        );
    }
}

function assertSortOrder(value) {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(
            "Catalog media metadata sortOrder must be a non-negative integer"
        );
    }
}

function normalizeDate(value, fieldName) {
    const normalizedDate = value instanceof Date ? new Date(value) : new Date(value);

    if (Number.isNaN(normalizedDate.getTime())) {
        throw new Error(
            `Catalog media metadata requires ${fieldName} to be a valid date`
        );
    }

    return normalizedDate;
}

export function getAllowedProductMediaMimeTypes() {
    return [...ALLOWED_PRODUCT_MEDIA_MIME_TYPES];
}
