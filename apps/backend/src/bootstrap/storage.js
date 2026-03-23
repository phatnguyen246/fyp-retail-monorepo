import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    applicationDefault,
    cert,
    getApps,
    initializeApp,
} from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const backendRootDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".."
);
const workspaceRootDirectory = path.resolve(backendRootDirectory, "..", "..");

function normalizeOptionalString(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function buildServiceAccountCandidates(serviceAccountPath) {
    const normalizedServiceAccountPath =
        normalizeOptionalString(serviceAccountPath);

    if (!normalizedServiceAccountPath) {
        return [];
    }

    if (path.isAbsolute(normalizedServiceAccountPath)) {
        return [normalizedServiceAccountPath];
    }

    const candidates = [
        path.resolve(process.cwd(), normalizedServiceAccountPath),
        path.resolve(backendRootDirectory, normalizedServiceAccountPath),
        path.resolve(workspaceRootDirectory, normalizedServiceAccountPath),
    ];

    const pathWithoutAppPrefix = normalizedServiceAccountPath.replace(
        /^\.?\/?app\//,
        ""
    );

    if (pathWithoutAppPrefix !== normalizedServiceAccountPath) {
        candidates.push(
            path.resolve(process.cwd(), pathWithoutAppPrefix),
            path.resolve(backendRootDirectory, pathWithoutAppPrefix),
            path.resolve(workspaceRootDirectory, pathWithoutAppPrefix)
        );
    }

    return [...new Set(candidates)];
}

function resolveServiceAccountCredential({
    serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
} = {}) {
    const candidatePath = buildServiceAccountCandidates(serviceAccountPath).find(
        (candidate) => existsSync(candidate)
    );

    if (!candidatePath) {
        return null;
    }

    const serviceAccount = JSON.parse(readFileSync(candidatePath, "utf8"));

    return cert(serviceAccount);
}

export function createFirebaseStorage({
    bucketName = process.env.FIREBASE_STORAGE_BUCKET,
    serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    logger = console,
} = {}) {
    const normalizedBucketName = normalizeOptionalString(bucketName);

    if (!normalizedBucketName) {
        return null;
    }

    try {
        const credential =
            resolveServiceAccountCredential({ serviceAccountPath }) ??
            applicationDefault();
        const app =
            getApps()[0] ??
            initializeApp({
                credential,
                storageBucket: normalizedBucketName,
            });

        return {
            bucket: getStorage(app).bucket(normalizedBucketName),
        };
    } catch (error) {
        logger.warn?.("Firebase Storage is unavailable:", error);

        return null;
    }
}
