import { Router } from "express";
import completionRoutes from "./completion";

export function attachAdminRoutes(adminRouter: Router) {
  // Attach routes for chat completion, defined separately
  completionRoutes(adminRouter);
}
