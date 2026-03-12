import multer from "multer";
import {
    CATALOG_PRODUCT_IMPORT_FORM_FIELD,
    CATALOG_PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES,
} from "../constants/index.js";
import { createCatalogBadRequestError } from "../services/catalog-service.errors.js";

export function createCatalogImportUploadMiddleware() {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: CATALOG_PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES,
            files: 1,
        },
    }).single(CATALOG_PRODUCT_IMPORT_FORM_FIELD);

    return (req, res, next) => {
        upload(req, res, (error) => {
            if (error) {
                return next(
                    createCatalogBadRequestError(
                        "Catalog product import request is invalid",
                        {
                            reason: error.message,
                        }
                    )
                );
            }

            if (!req.file) {
                return next(
                    createCatalogBadRequestError(
                        "Catalog product import requires a CSV file"
                    )
                );
            }

            return next();
        });
    };
}
