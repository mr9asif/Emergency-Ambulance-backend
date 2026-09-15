import express from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { tripController } from "./trip.controller.js";

const router = express.Router();

router.patch(
  "/:tripId/start",
  auth(UserRole.OPERATOR),
  tripController.startTrip,
);

export const tripRoute = router;
