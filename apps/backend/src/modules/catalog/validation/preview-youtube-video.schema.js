import { z } from "zod";
import { trimTextInput } from "./catalog.normalizers.js";

export const PREVIEW_YOUTUBE_VIDEO_INPUT_SCHEMA = z
    .object({
        url: z.preprocess(trimTextInput, z.string().url()),
    })
    .strict();

export function parsePreviewYoutubeVideoInput(input) {
    return PREVIEW_YOUTUBE_VIDEO_INPUT_SCHEMA.parse(input);
}
