import { Router } from "express";
import listingsRoutes from "./listings.js";
import busesRoutes from "./buses.js";
import driversRoutes from "./drivers.js";
import transportRoutes from "./transportRoutes.js";
import carsRoutes from "./cars.js";
import carBookingsRoutes from "./carBookings.js";
import scheduledCarsRoutes from "./scheduledCars.js";
import flightsRoutes from "./flights.js";
import flightBookingsRoutes from "./flightBookings.js";
import experiencesRoutes from "./experiences.js";
import eventsRoutes from "./events.js";

const router = Router();

// Ensure listingId is always on req for nested routes (param merging can drop it in some setups)
const nestedRouter = Router({ mergeParams: true });
nestedRouter.use((req, _res, next) => {
  req.listingId = req.params.listingId ?? req.listingId;
  next();
});
nestedRouter.use("/buses", busesRoutes);
nestedRouter.use("/cars", carsRoutes);
nestedRouter.use("/car-bookings", carBookingsRoutes);
nestedRouter.use("/scheduled-cars", scheduledCarsRoutes);
nestedRouter.use("/flights", flightsRoutes);
nestedRouter.use("/flight-bookings", flightBookingsRoutes);
nestedRouter.use("/experience", experiencesRoutes);
nestedRouter.use("/event", eventsRoutes);
nestedRouter.use("/drivers", driversRoutes);
nestedRouter.use("/routes", transportRoutes);

// Listings routes first so POST /:id/generate-verification-token is matched (then nested routes for /:id/buses etc.)
router.use("/", listingsRoutes);
router.use("/:listingId", nestedRouter);

export default router;
