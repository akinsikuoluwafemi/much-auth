import "dotenv/config"; // must be first
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";
import mfaRoutes from "./routes/mfa.js";
import orgRoutes from "./routes/orgs.js";
import jwksRoutes from "./routes/jwks.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use("/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/mfa", mfaRoutes);
app.use("/orgs", orgRoutes);
app.use("/.well-known", jwksRoutes);

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
