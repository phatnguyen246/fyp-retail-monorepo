// apps/backend/src/bootstrap/app.js
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import dns from "node:dns";
import express from "express";
import helmet from "helmet";
import net from "node:net";
import { createGlobalErrorHandler } from "./error-handler.js";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";
import { createFirebaseStorage } from "./storage.js";

function normalizeOrigin(origin) {
    if (typeof origin !== "string") {
        return "";
    }
    return origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function resolveAllowedOrigins(rawOrigins) {
    if (!rawOrigins) {
        return null;
    }
    const normalized = rawOrigins
        .split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean);
    return normalized.length ? normalized : null;
}

function resolveDnsLookup(hostname) {
    return new Promise((resolve) => {
        dns.lookup(hostname, { all: true }, (error, addresses) => {
            resolve({
                ok: !error,
                error: error ? error.message : null,
                addresses: addresses ?? [],
            });
        });
    });
}

function resolveDnsRecords(hostname, resolver) {
    return new Promise((resolve) => {
        resolver(hostname, (error, records) => {
            resolve({
                ok: !error,
                error: error ? error.message : null,
                records: records ?? [],
            });
        });
    });
}

function testTcpConnection({
    host,
    port,
    family,
    timeoutMs = 5000,
} = {}) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const socket = net.connect({
            host,
            port,
            family,
        });

        let settled = false;
        function finish(payload) {
            if (settled) {
                return;
            }
            settled = true;
            socket.destroy();
            resolve({
                ...payload,
                elapsedMs: Date.now() - startedAt,
            });
        }

        socket.setTimeout(timeoutMs);
        socket.once("connect", () => finish({ ok: true, error: null }));
        socket.once("timeout", () => finish({ ok: false, error: "timeout" }));
        socket.once("error", (error) =>
            finish({
                ok: false,
                error: error?.message ?? "Unknown connection error",
                code: error?.code ?? null,
                address: error?.address ?? null,
            })
        );
    });
}

export async function createApp({
    connectMongoFn = connectMongo,
    createStorageFn = createFirebaseStorage,
    storage,
} = {}) {
    const { client, db } = await connectMongoFn();
    const resolvedStorage =
        storage === undefined ? createStorageFn() : storage;

    const app = express();
    const allowedOrigins = resolveAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

    app.use(helmet());
    app.use(
        cors({
            origin: (requestOrigin, callback) => {
                if (!allowedOrigins) {
                    callback(null, true);
                    return;
                }
                const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
                callback(null, allowedOrigins.includes(normalizedRequestOrigin));
            },
            credentials: true,
        })
    );
    app.use(compression());
    app.use(express.json());
    app.use(cookieParser());
    app.get("/debug/time", (_req, res) => {
        const now = new Date();
        res.status(200).json({
            iso: now.toISOString(),
            local: now.toString(),
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            envTZ: process.env.TZ ?? null,
            offsetMinutes: now.getTimezoneOffset(),
        });
    });
    app.get("/debug/smtp", async (_req, res) => {
        const host = process.env.SMTP_HOST ?? null;
        const port = Number(process.env.SMTP_PORT ?? 587);

        if (!host) {
            res.status(400).json({
                ok: false,
                error: "SMTP_HOST is not configured",
                env: {
                    smtpHost: host,
                    smtpPort: port,
                    nodeEnv: process.env.NODE_ENV ?? null,
                },
            });
            return;
        }

        const [lookup, resolve4, resolve6, tcpAny, tcp4, tcp6] = await Promise.all([
            resolveDnsLookup(host),
            resolveDnsRecords(host, dns.resolve4),
            resolveDnsRecords(host, dns.resolve6),
            testTcpConnection({ host, port }),
            testTcpConnection({ host, port, family: 4 }),
            testTcpConnection({ host, port, family: 6 }),
        ]);

        res.status(200).json({
            ok: true,
            env: {
                smtpHost: host,
                smtpPort: port,
                nodeEnv: process.env.NODE_ENV ?? null,
                tz: process.env.TZ ?? null,
            },
            dns: {
                lookup,
                resolve4,
                resolve6,
            },
            tcp: {
                any: tcpAny,
                ipv4: tcp4,
                ipv6: tcp6,
            },
        });
    });
    app.locals.mongoClient = client;
    app.locals.db = db;
    app.locals.storage = resolvedStorage ?? null;

    registerModules({ app, db, storage: resolvedStorage ?? undefined });

    app.use(createGlobalErrorHandler());

    return app;
}
