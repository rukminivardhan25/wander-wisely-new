import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import tripsRoutes from "./routes/trips.js";
import destinationsRoutes from "./routes/destinations.js";
import postsRoutes from "./routes/posts.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:8081";
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || "http://localhost:8080",
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Wander Wisely API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/destinations", destinationsRoutes);
app.use("/api/posts", postsRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
