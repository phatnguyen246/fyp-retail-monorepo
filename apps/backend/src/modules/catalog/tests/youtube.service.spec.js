import { describe, expect, it, vi } from "vitest";
import {
    createYoutubeService,
    extractYoutubeVideoId,
} from "../services/youtube.service.js";

describe("youtube service", () => {
    it("extracts video ids from common YouTube URL formats", () => {
        expect(
            extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        ).toBe("dQw4w9WgXcQ");
        expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
            "dQw4w9WgXcQ"
        );
        expect(
            extractYoutubeVideoId(
                "https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc"
            )
        ).toBe("dQw4w9WgXcQ");
        expect(extractYoutubeVideoId("https://example.com/watch?v=invalid")).toBe(
            null
        );
    });

    it("fetches metadata and normalizes youtube payload", async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                items: [
                    {
                        snippet: {
                            title: "Sample video title",
                            thumbnails: {
                                high: {
                                    url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                                },
                            },
                        },
                        contentDetails: {
                            duration: "PT3M32S",
                        },
                    },
                ],
            }),
        });
        const service = createYoutubeService({
            env: { YOUTUBE_API_KEY: "youtube-key" },
            fetchImpl,
        });

        const metadata = await service.fetchVideoMetadata(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        );

        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(metadata).toEqual({
            videoId: "dQw4w9WgXcQ",
            title: "Sample video title",
            thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            duration: "PT3M32S",
        });
    });

    it("throws bad request when URL cannot be parsed", async () => {
        const service = createYoutubeService({
            env: { YOUTUBE_API_KEY: "youtube-key" },
            fetchImpl: vi.fn(),
        });

        await expect(
            service.fetchVideoMetadata("https://example.com/not-youtube")
        ).rejects.toMatchObject({
            httpStatus: 400,
            code: "CATALOG_BAD_REQUEST",
        });
    });
});
