// apps/backend/src/modules/catalog/infrastructure/persistence/cursor.codec.js

export function encodeCursor(payload) {
    if (!isPlainObject(payload)) {
        throw new Error("INVALID_CURSOR_PAYLOAD");
    }
    const { f, d, v, id } = payload;
    if (!f || !d || v == null || !id) {
        throw new Error("INVALID_CURSOR_PAYLOAD");
    }
    const json = JSON.stringify({ f, d, v, id });
    return base64UrlEncode(json);
}

export function decodeCursor(token) {
    if (typeof token !== "string" || token.trim().length === 0) {
        throw new Error("INVALID_CURSOR_TOKEN");
    }
    const json = base64UrlDecode(token);
    let payload;
    try {
        payload = JSON.parse(json);
    } catch {
        throw new Error("INVALID_CURSOR_TOKEN");
    }
    if (!isPlainObject(payload)) {
        throw new Error("INVALID_CURSOR_TOKEN");
    }
    const { f, d, v, id } = payload;
    if (!f || !d || v == null || !id) {
        throw new Error("INVALID_CURSOR_TOKEN");
    }
    return { f, d, v, id };
}

function base64UrlEncode(input) {
    return Buffer.from(String(input), "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
    const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    const padded = pad ? s + "=".repeat(4 - pad) : s;
    return Buffer.from(padded, "base64").toString("utf8");
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
