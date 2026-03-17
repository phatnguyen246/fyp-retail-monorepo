function pad(value) {
    return String(value).padStart(2, "0");
}

export function formatDateYmdHis(date) {
    return (
        [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate()),
        ].join("") +
        [
            pad(date.getHours()),
            pad(date.getMinutes()),
            pad(date.getSeconds()),
        ].join("")
    );
}

export function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
