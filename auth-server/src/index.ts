import "dotenv/config"; // must be first
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";
import mfaRoutes from "./routes/mfa";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000", // your Next.js app
    credentials: true, // allows cookie to be sent
  }),
);

app.use("/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/mfa", mfaRoutes);

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
