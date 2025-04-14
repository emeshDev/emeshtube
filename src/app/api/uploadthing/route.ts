import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Gunakan createRouteHandler untuk mendapatkan handler
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
