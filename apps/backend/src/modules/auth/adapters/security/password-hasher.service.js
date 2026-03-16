import bcrypt from "bcrypt";

export function createPasswordHasher({
    bcryptLib = bcrypt,
    saltRounds = 10,
} = {}) {
    return {
        hashPassword(password) {
            return bcryptLib.hash(password, saltRounds);
        },

        verifyPassword(password, passwordHash) {
            return bcryptLib.compare(password, passwordHash);
        },
    };
}

