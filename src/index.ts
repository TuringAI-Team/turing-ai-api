import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import "dotenv/config";

// routes
import ImageRoutes from "./routes/image.routes.js";
import TextRoutes from "./routes/text.routes.js";
import AudioRoutes from "./routes/audio.routes.js";
import OtherRoutes from "./routes/other.routes.js";

const app: Application = express();

import { getToken, verifyToken } from "./middlewares/key.js";
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://app.turing-ai.xyz"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

app.use("/", ImageRoutes);
app.use("/", TextRoutes);
app.use("/", AudioRoutes);
app.use("/", OtherRoutes);

app.listen(app.get("port"), async () => {
  console.log(`Server is running on port ${app.get("port")}`);
});
