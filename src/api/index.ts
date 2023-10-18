import { Router } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ConfigModule } from "@medusajs/medusa";
import { getConfigFile } from "medusa-core-utils";
import { attachAdminRoutes } from "./routes/admin";

export default (rootDirectory: string, options): Router | Router[] => {
  // Read currently-loaded medusa config
  const { configModule } = getConfigFile<ConfigModule>(
    rootDirectory,
    "medusa-config"
  );
  const { projectConfig } = configModule;

  // Set up our CORS options objects, based on config
  const adminCorsOptions = {
    origin: projectConfig?.admin_cors?.split(",") || [],
    credentials: true,
  };

  // Set up express router
  const router = Router();

  // Set up root routes for store and admin endpoints, with appropriate CORS settings
  router.use("/admin", cors(adminCorsOptions), bodyParser.json());

  // Set up routers for store and admin endpoints
  const adminRouter = Router();

  // Attach these routers to the root routes
  router.use("/admin", adminRouter);

  // Attach custom routes to these routers
  attachAdminRoutes(adminRouter);

  return router;
};
