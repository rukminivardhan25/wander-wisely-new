import { Router } from "express";
import listingsRoutes from "./listings.js";
import busesRoutes from "./buses.js";
import transportRoutes from "./transportRoutes.js";
import listingAvailabilityRoutes from "./listingAvailability.js";
import driversRoutes from "./drivers.js";

const router = Router();

// Nested routes first (so /api/listings/:listingId/buses, /routes, etc. are matched before /:id)
router.use("/:listingId/buses", busesRoutes);
router.use("/:listingId/routes", transportRoutes);
router.use("/:listingId/availability", listingAvailabilityRoutes);
router.use("/:listingId/drivers", driversRoutes);

// Then top-level listing CRUD (/, /:id)
router.use("/", listingsRoutes);

export default router;
