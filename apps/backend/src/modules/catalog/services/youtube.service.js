import {
    createCatalogBadRequestError,
    createCatalogServiceUnavailableError,
} from "./catalog-service.errors.js";

const YOUTUBE_API_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const VIDEO_ID_PATTERN =
    /^[a-zA-Z0-9_-]{11}$/;

function isSupportedHttpUrl(value) {
    if (typeof value !== "string") {
        return false;
    }

    try {
        const parsedUrl = new URL(value);
        return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch {
        return false;
    }
}

export function extractYoutubeVideoId(inputUrl) {
    if (!isSupportedHttpUrl(inputUrl)) {
        return null;
    }

    const url = new URL(inputUrl);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
        const candidate = url.pathname.replace(/^\/+/, "").split("/")[0];
        return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
    }

    if (
        host.endsWith("youtube.com") ||
        host.endsWith("youtube-nocookie.com")
    ) {
        const fromQuery = url.searchParams.get("v");

        if (fromQuery && VIDEO_ID_PATTERN.test(fromQuery)) {
            return fromQuery;
        }

        const segments = url.pathname
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean);
        const candidate = segments.at(-1);

        if (candidate && VIDEO_ID_PATTERN.test(candidate)) {
            return candidate;
        }
    }

    return null;
}

function resolveYoutubeThumbnailUrl(snippet = {}, videoId) {
    return (
        snippet?.thumbnails?.maxres?.url ??
        snippet?.thumbnails?.standard?.url ??
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url ??
        (videoId
            ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            : null)
    );
}

export function createYoutubeService({
    env = process.env,
    fetchImpl = fetch,
} = {}) {
    return {
        async fetchVideoMetadata(inputUrl) {
            const videoId = extractYoutubeVideoId(inputUrl);

            if (!videoId) {
                throw createCatalogBadRequestError(
                    "YouTube URL is invalid or unsupported",
                    {
                        field: "youtubeVideoUrl",
                        value: inputUrl,
                    }
                );
            }

            const apiKey = env?.YOUTUBE_API_KEY?.trim();

            if (!apiKey) {
                throw createCatalogServiceUnavailableError(
                    "YouTube API key is not configured"
                );
            }

            const queryParams = new URLSearchParams({
                part: "snippet,contentDetails",
                id: videoId,
                key: apiKey,
            });
            const response = await fetchImpl(
                `${YOUTUBE_API_ENDPOINT}?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw createCatalogServiceUnavailableError(
                    "Unable to fetch YouTube video metadata",
                    {
                        status: response.status,
                        videoId,
                    }
                );
            }

            const payload = await response.json();
            const item = Array.isArray(payload?.items)
                ? payload.items[0]
                : null;

            if (!item) {
                throw createCatalogBadRequestError(
                    "YouTube video was not found or is unavailable",
                    {
                        field: "youtubeVideoUrl",
                        value: inputUrl,
                    }
                );
            }

            const title = item?.snippet?.title?.trim();
            const thumbnailUrl = resolveYoutubeThumbnailUrl(
                item?.snippet,
                videoId
            );

            return {
                videoId,
                title: title && title.length > 0 ? title : videoId,
                thumbnailUrl,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                duration: item?.contentDetails?.duration ?? null,
            };
        },
    };
}
