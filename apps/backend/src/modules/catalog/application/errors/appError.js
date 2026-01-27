export class AppError extends Error {
    constructor(code, httpStatus = 400, message = "Application error", meta = null) {
        super(message);

        this.name = "AppError";
        this.code = code;
        this.httpStatus = httpStatus;
        this.meta = meta;

        Error.captureStackTrace?.(this, AppError);
    }
}
