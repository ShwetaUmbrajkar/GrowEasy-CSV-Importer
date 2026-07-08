import { Router } from "express";
import { csvUpload } from "../middleware/upload";
import { getImportStatus, startImport } from "../controllers/import.controller";

const router = Router();

// Wrap async handlers so thrown errors reach the centralized error handler.
const asyncHandler =
  (fn: (req: any, res: any) => Promise<void> | void) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res)).catch(next);

router.post("/start", csvUpload.single("file"), asyncHandler(startImport));
router.get("/status/:jobId", asyncHandler(getImportStatus));

export default router;
