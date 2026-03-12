import { ZodError } from "zod";

function formatIssuePath(path = []) {
    if (!Array.isArray(path) || path.length === 0) {
        return "";
    }

    return path.reduce((formattedPath, segment) => {
        if (typeof segment === "number") {
            return `${formattedPath}[${segment}]`;
        }

        return formattedPath.length === 0
            ? String(segment)
            : `${formattedPath}.${String(segment)}`;
    }, "");
}

export function createValidationErrorResponse(error) {
    return {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        meta: {
            issues: error.issues.map((issue) => ({
                path: formatIssuePath(issue.path),
                message: issue.message,
                code: issue.code,
            })),
        },
    };
}

export function createGlobalErrorHandler({ logger = console } = {}) {
    return (err, _req, res, _next) => {
        if (err instanceof ZodError) {
            return res.status(422).json(createValidationErrorResponse(err));
        }

        if (typeof err?.httpStatus === "number") {
            return res.status(err.httpStatus).json({
                code: err.code,
                message: err.message,
                meta: err.meta ?? undefined,
            });
        }

        const status = 500;
        const code = err?.code || "INTERNAL_ERROR";
        const message = "Internal Server Error";

        logger.error(err);

        return res.status(status).json({ code, message });
    };
}
