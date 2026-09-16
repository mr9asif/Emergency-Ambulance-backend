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

router.patch(
  "/:tripId/arrive-pickup",
  auth(UserRole.OPERATOR),
  tripController.arriveAtPickup,
);

router.patch(
  "/:tripId/confirm-pickup",
  auth(UserRole.CUSTOMER),
  tripController.confirmPickup,
);

router.patch(
  "/:tripId/start-hospital",
  auth(UserRole.OPERATOR),
  tripController.startHospitalJourney,
);

router.patch(
  "/:tripId/arrive-hospital",
  auth(UserRole.OPERATOR),
  tripController.arriveAtHospital,
);

router.get(
  "/my-trips",
  auth(UserRole.CUSTOMER, UserRole.OPERATOR),
  tripController.getMyTrips,
);

router.get(
  "/:tripId",
  auth(UserRole.CUSTOMER, UserRole.OPERATOR),
  tripController.getTripById,
);

router.get(
  "/",
  auth(UserRole.OPERATOR, UserRole.ADMIN),
  tripController.getAllTrips,
);
export const tripRoute = router;
