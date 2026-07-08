import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import importRoutes from "./routes/import.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/import", importRoutes);

// Must be registered last.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend running on port ${PORT}`);
});
