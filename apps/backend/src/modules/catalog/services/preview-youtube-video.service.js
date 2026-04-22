import { createCatalogValidation } from "../validation/index.js";
import { createCatalogServiceUnavailableError } from "./catalog-service.errors.js";

export function createPreviewYoutubeVideoService({
    validation = createCatalogValidation(),
    youtubeService,
} = {}) {
    return async function previewYoutubeVideo({ input } = {}) {
        if (!youtubeService || typeof youtubeService.fetchVideoMetadata !== "function") {
            throw createCatalogServiceUnavailableError(
                "YouTube service is unavailable"
            );
        }
        const parsedInput = validation.parsePreviewYoutubeVideoInput(input ?? {});
        const metadata = await youtubeService.fetchVideoMetadata(parsedInput.url);

        return {
            videoId: metadata.videoId,
            title: metadata.title,
            thumbnailUrl: metadata.thumbnailUrl,
            url: metadata.url,
            duration: metadata.duration ?? null,
        };
    };
}
