function normalizeClientIp(ipAddress) {
    if (typeof ipAddress !== "string") {
        return null;
    }

    const normalized = ipAddress.trim();

    if (!normalized) {
        return null;
    }

    if (normalized === "::1") {
        return "127.0.0.1";
    }

    if (normalized.startsWith("::ffff:")) {
        return normalized.slice("::ffff:".length);
    }

    return normalized;
}

export function getClientIp(req) {
    return (
        normalizeClientIp(req.headers["x-forwarded-for"]?.split(",")[0]) ||
        normalizeClientIp(req.connection?.remoteAddress) ||
        normalizeClientIp(req.socket?.remoteAddress) ||
        normalizeClientIp(req.connection?.socket?.remoteAddress) ||
        "127.0.0.1"
    );
}
