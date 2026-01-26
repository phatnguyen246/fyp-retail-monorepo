const express = require("express");

const app = express();

app.get("/getmethod", (req, res) => {
    res.json({ ok: true });
});

app.listen(3001, () => {
    console.log("Backend listening on http://localhost:3001");
});
