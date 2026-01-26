// apps/backend/index.js
import { createApp } from "./src/bootstrap/app.js";

const app = await createApp();

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:3000`);
});
