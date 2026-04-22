import { hasOwn } from "./catalog-admin.service-helpers.js";
import { createCatalogServiceUnavailableError } from "./catalog-service.errors.js";

export async function resolveProductYoutubeVideoPatch({
    parsedInput,
    youtubeService,
    inputFieldName = "youtubeVideoUrl",
} = {}) {
    if (!hasOwn(parsedInput, inputFieldName)) {
        return {};
    }

    const youtubeVideoUrl = parsedInput[inputFieldName];

    if (!youtubeVideoUrl) {
        return {
            youtubeVideo: null,
        };
    }

    if (!youtubeService || typeof youtubeService.fetchVideoMetadata !== "function") {
        throw createCatalogServiceUnavailableError(
            "YouTube service is unavailable"
        );
    }

    const metadata = await youtubeService.fetchVideoMetadata(youtubeVideoUrl);

    return {
        youtubeVideo: {
            videoId: metadata.videoId,
            title: metadata.title,
            thumbnailUrl: metadata.thumbnailUrl,
            url: metadata.url,
        },
    };
}
