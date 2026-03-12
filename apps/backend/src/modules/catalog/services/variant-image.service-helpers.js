import { randomUUID } from "node:crypto";
import path from "node:path";
import {
    CATALOG_VARIANT_IMAGE_FORM_FIELD,
    CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
} from "../constants/index.js";
import { getAllowedProductMediaMimeTypes } from "../models/index.js";
import {
    createCatalogServiceUnavailableError,
    createCatalogUnprocessableEntityError,
} from "./catalog-service.errors.js";

const ALLOWED_VARIANT_IMAGE_MIME_TYPES = new Set(
    getAllowedProductMediaMimeTypes()
);

const MIME_TYPE_TO_EXTENSION = Object.freeze({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
});

export function assertVariantImageStorageAvailable(storage) {
    if (!storage?.uploadVariantImage || !storage?.deleteVariantImage) {
        throw createCatalogServiceUnavailableError(
            "Catalog variant image storage is unavailable"
        );
    }
}

export function assertVariantImageFile(file) {
    if (!file || typeof file !== "object") {
        throw createCatalogUnprocessableEntityError(
            "Catalog variant image upload requires an image file",
            {
                field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
            }
        );
    }

    if (!ALLOWED_VARIANT_IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw createCatalogUnprocessableEntityError(
            `Catalog variant image mimeType must be one of: ${[
                ...ALLOWED_VARIANT_IMAGE_MIME_TYPES,
            ].join(", ")}`,
            {
                field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                mimeType: file.mimetype,
            }
        );
    }

    if (
        !Number.isInteger(file.size) ||
        file.size < 0 ||
        file.size > CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES
    ) {
        throw createCatalogUnprocessableEntityError(
            `Catalog variant image size must be <= ${CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES} bytes`,
            {
                field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                size: file.size,
                maxFileSizeBytes: CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
            }
        );
    }
}

export function createStoredVariantImageFileName(file) {
    assertVariantImageFile(file);

    const originalExtension = path.extname(file.originalname ?? "").toLowerCase();
    const preferredExtension = MIME_TYPE_TO_EXTENSION[file.mimetype];
    const extension =
        originalExtension === preferredExtension
            ? originalExtension
            : preferredExtension;

    return `${randomUUID()}${extension}`;
}

export function getVariantImageSortOrder(mediaList = []) {
    if (!Array.isArray(mediaList) || mediaList.length === 0) {
        return 0;
    }

    return mediaList.reduce((maxSortOrder, media) => {
        return Math.max(maxSortOrder, media?.sortOrder ?? 0);
    }, 0) + 1;
}
