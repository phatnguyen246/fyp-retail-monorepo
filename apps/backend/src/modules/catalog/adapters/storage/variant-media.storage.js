function normalizeRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Catalog variant media storage requires ${fieldName}`);
    }

    return value.trim();
}

function normalizeRequiredFileBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error(
            "Catalog variant media storage requires file.buffer as a non-empty Buffer"
        );
    }

    return buffer;
}

function normalizeFileSize(size) {
    if (!Number.isInteger(size) || size < 0) {
        throw new Error(
            "Catalog variant media storage requires file.size as a non-negative integer"
        );
    }

    return size;
}

function encodeStoragePath(storagePath) {
    return storagePath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

function buildStorageObjectUrl({ bucketName, storagePath }) {
    return `https://storage.googleapis.com/${encodeURIComponent(bucketName)}/${encodeStoragePath(storagePath)}`;
}

export function createVariantMediaStorage({ bucket } = {}) {
    if (!bucket || typeof bucket.file !== "function") {
        throw new Error(
            "Catalog variant media storage requires a bucket-like client"
        );
    }

    const bucketName = normalizeRequiredString(bucket.name, "bucket.name");

    function buildVariantImageStoragePath({ productId, variantId, fileName }) {
        const normalizedProductId = normalizeRequiredString(
            productId,
            "productId"
        );
        const normalizedVariantId = normalizeRequiredString(
            variantId,
            "variantId"
        );
        const normalizedFileName = normalizeRequiredString(fileName, "fileName");

        return `catalog/products/${normalizedProductId}/variants/${normalizedVariantId}/${normalizedFileName}`;
    }

    async function uploadVariantImage(file, { productId, variantId } = {}) {
        if (!file || typeof file !== "object") {
            throw new Error(
                "Catalog variant media storage requires a multer-style file object"
            );
        }

        const fileName = normalizeRequiredString(
            file.originalname,
            "file.originalname"
        );
        const mimeType = normalizeRequiredString(
            file.mimetype,
            "file.mimetype"
        );
        const size = normalizeFileSize(file.size);
        const buffer = normalizeRequiredFileBuffer(file.buffer);
        const storagePath = buildVariantImageStoragePath({
            productId,
            variantId,
            fileName,
        });
        const blob = bucket.file(storagePath);

        await blob.save(buffer, {
            contentType: mimeType,
        });

        return {
            storagePath,
            url: buildStorageObjectUrl({ bucketName, storagePath }),
            fileName,
            mimeType,
            size,
        };
    }

    async function deleteVariantImage(storagePath) {
        const normalizedStoragePath = normalizeRequiredString(
            storagePath,
            "storagePath"
        );
        const blob = bucket.file(normalizedStoragePath);

        await blob.delete();
    }

    return {
        buildVariantImageStoragePath,
        uploadVariantImage,
        deleteVariantImage,
    };
}
