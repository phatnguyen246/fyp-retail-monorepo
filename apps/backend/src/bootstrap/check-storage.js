import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createFirebaseStorage } from "./storage.js";

function normalizeBucketName(bucketName) {
    if (typeof bucketName !== "string") {
        return "";
    }

    return bucketName.trim();
}

export async function checkFirebaseStorageConnection({
    createStorageFn = createFirebaseStorage,
    bucketName = process.env.FIREBASE_STORAGE_BUCKET,
    logger = console,
} = {}) {
    const normalizedBucketName = normalizeBucketName(bucketName);

    if (!normalizedBucketName) {
        throw new Error("Missing FIREBASE_STORAGE_BUCKET environment variable");
    }

    const storage = createStorageFn({
        bucketName: normalizedBucketName,
        logger,
    });

    if (!storage?.bucket || typeof storage.bucket.getMetadata !== "function") {
        throw new Error(
            `Unable to initialize Google Storage bucket "${normalizedBucketName}"`
        );
    }

    const [metadata] = await storage.bucket.getMetadata();
    const resolvedBucketName = metadata?.name || storage.bucket.name;

    logger.log(
        `Google Storage connected successfully to bucket "${resolvedBucketName}"`
    );

    if (metadata?.location) {
        logger.log(`Bucket location: ${metadata.location}`);
    }

    if (metadata?.storageClass) {
        logger.log(`Bucket storage class: ${metadata.storageClass}`);
    }

    return {
        bucket: storage.bucket,
        metadata,
    };
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        try {
            await checkFirebaseStorageConnection();
        } catch (error) {
            console.error("Google Storage connection check failed:", error);
            process.exitCode = 1;
        }
    }
}
