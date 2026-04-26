import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "wire", ts: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`[Wire API] running on port ${PORT}`);
});
