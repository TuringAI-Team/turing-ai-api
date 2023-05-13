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
import VideoRoutes from "./routes/video.routes.js";
import ChartRoutes from "./routes/chart.routes.js";

const app: Application = express();

import { verifyToken } from "./middlewares/key.js";
import Ciclic from "./modules/ciclic.js";

// generateKey([
//   "152.160.174.34",
//   "172.16.5.4",
//   "172.17.0.1",
//   "127.0.0.1",
//   "0.0.0.0"
// ]);

app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://app.turing-ai.xyz",
      "https://app.turing.sh",
    ],
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
app.use("/video", VideoRoutes);
app.use("/chart", ChartRoutes);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Turing AI",
      version: "1.0.0",
      description: "API Documentation for Turing AI",
    },
    servers: [
      {
        url: `https://api.turingai.tech/`,
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJSDoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

app.listen(app.get("port"), async () => {
  console.log(`Server is running on port ${app.get("port")}`);
  await Ciclic();
});
