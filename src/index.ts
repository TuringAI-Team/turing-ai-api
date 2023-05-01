import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import "dotenv/config";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { generateKey } from "./modules/keys.js";

// routes
import ImageRoutes from "./routes/image.routes.js";
import TextRoutes from "./routes/text.routes.js";
import AudioRoutes from "./routes/audio.routes.js";
import OtherRoutes from "./routes/other.routes.js";
import CacheRoutes from "./routes/cache.routes.js";

const app: Application = express();

import { verifyToken } from "./middlewares/key.js";
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://app.turing-ai.xyz"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-captcha-token"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.set("port", process.env.PORT || 3000);

app.use("/imgs", ImageRoutes);
app.use("/text", TextRoutes);
app.use("/audio", AudioRoutes);
app.use("/other", OtherRoutes);
app.use("/cache", CacheRoutes);

app.listen(app.get("port"), async () => {
  console.log(`Server is running on port ${app.get("port")}`);
});
