import multer from "multer";

const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      return cb(new Error("Only .csv files are allowed"));
    }
    cb(null, true);
  },
});
