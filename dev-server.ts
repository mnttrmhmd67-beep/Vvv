import app from "./server.js";
import { createServer as createViteServer } from "vite";

async function startDevServer() {
  const PORT = 3000;
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Asas Platform] Dev Server running on http://localhost:${PORT}`);
  });
}

startDevServer();
