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
    origin: ["http://lukas-batema-super-space-garbanzo-95qqxr69x4qcx7wr-3000.preview.app.github.dev/", "https://app.turing-ai.xyz"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-captcha-token"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.set("port", process.env.PORT || 3000);

// key middleware
app.use(async (req: Request, res: Response, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization;
    if (token) {
      var isvalid = await verifyToken(token.replaceAll("Bearer ", ""));
      if (isvalid) {
        next();
      } else {
        res.status(401).send({ error: "Unauthorized" });
      }
    } else {
      res.status(401).send({ error: "Unauthorized" });
    }
  } else {
    res.status(401).send({ error: "Unauthorized" });
  }
});

app.use("/imgs", ImageRoutes);
app.use("/text", TextRoutes);
app.use("/audio", AudioRoutes);
app.use("/other", OtherRoutes);
app.use("/cache", CacheRoutes);

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
        url: `http://lukas-batema-super-space-garbanzo-95qqxr69x4qcx7wr-3000.preview.app.github.dev/`,
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJSDoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

app.listen(app.get("port"), async () => {
  console.log(`Server is running on port ${app.get("port")}`);
});
