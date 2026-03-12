import multer from "multer";
import {
    CATALOG_VARIANT_IMAGE_FORM_FIELD,
    CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
} from "../constants/index.js";
import { getAllowedProductMediaMimeTypes } from "../models/index.js";
import { createCatalogUnprocessableEntityError } from "../services/catalog-service.errors.js";

const ALLOWED_VARIANT_IMAGE_MIME_TYPES = new Set(
    getAllowedProductMediaMimeTypes()
);

export function mapVariantImageUploadError(error) {
    if (!error) {
        return null;
    }

    if (typeof error?.httpStatus === "number") {
        return error;
    }

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return createCatalogUnprocessableEntityError(
                `Catalog variant image size must be <= ${CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES} bytes`,
                {
                    field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                    maxFileSizeBytes: CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
                }
            );
        }

        return createCatalogUnprocessableEntityError(
            "Catalog variant image upload request is invalid",
            {
                field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                multerCode: error.code,
            }
        );
    }

    return error;
}

export function createVariantImageUploadMiddleware({
    multerFactory = multer,
} = {}) {
    const upload = multerFactory({
        storage: multerFactory.memoryStorage(),
        limits: {
            fileSize: CATALOG_VARIANT_IMAGE_MAX_FILE_SIZE_BYTES,
            files: 1,
        },
        fileFilter(_req, file, callback) {
            if (!ALLOWED_VARIANT_IMAGE_MIME_TYPES.has(file.mimetype)) {
                callback(
                    createCatalogUnprocessableEntityError(
                        `Catalog variant image mimeType must be one of: ${[
                            ...ALLOWED_VARIANT_IMAGE_MIME_TYPES,
                        ].join(", ")}`,
                        {
                            field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                            mimeType: file.mimetype,
                        }
                    )
                );

                return;
            }

            callback(null, true);
        },
    }).single(CATALOG_VARIANT_IMAGE_FORM_FIELD);

    return function variantImageUploadMiddleware(req, res, next) {
        upload(req, res, (error) => {
            const mappedError = mapVariantImageUploadError(error);

            if (mappedError) {
                next(mappedError);

                return;
            }

            if (!req.file) {
                next(
                    createCatalogUnprocessableEntityError(
                        "Catalog variant image upload requires an image file",
                        {
                            field: CATALOG_VARIANT_IMAGE_FORM_FIELD,
                        }
                    )
                );

                return;
            }

            next();
        });
    };
}
