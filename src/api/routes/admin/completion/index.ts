import { wrapHandler } from "@medusajs/utils";
import { Router } from "express";
import orderReturns from "./order-returns";
import { authenticate } from "@medusajs/medusa";

const router = Router();

export default (adminRouter: Router) => {
  adminRouter.use("/completion", router);
  adminRouter.use("/completion", authenticate());

  router.post("/order-returns", wrapHandler(orderReturns));
};
