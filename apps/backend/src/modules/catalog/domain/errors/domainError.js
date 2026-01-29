export class DomainError extends Error {
    constructor(code, message = code, meta = null) {
        super(message ?? code);

        this.name = "DomainError";
        this.code = code;
        this.meta = meta;

        Error.captureStackTrace?.(this, DomainError);
    }
}
