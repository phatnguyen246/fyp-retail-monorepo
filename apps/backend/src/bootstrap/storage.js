import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

export function createFirebaseStorage({
    bucketName = process.env.FIREBASE_STORAGE_BUCKET,
    logger = console,
} = {}) {
    if (typeof bucketName !== "string" || bucketName.trim().length === 0) {
        return null;
    }

    try {
        const app =
            getApps()[0] ??
            initializeApp({
                credential: applicationDefault(),
                storageBucket: bucketName.trim(),
            });

        return {
            bucket: getStorage(app).bucket(bucketName.trim()),
        };
    } catch (error) {
        logger.warn?.("Firebase Storage is unavailable:", error);

        return null;
    }
}
