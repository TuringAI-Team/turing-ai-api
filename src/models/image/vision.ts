import axios from "axios";
import { request, translateModels } from "../../utils/runpod.js";
import { EventEmitter } from "events";
import upscale from "./upscale.js";

export default {
  data: {
    name: "vision",
    fullName: "Image vision",
    description: "Image analysis to extract text and description",
    parameters: {
      model: {
        type: "array",
        required: true,
        options: ["blip2", "ocr"],
        default: ["blip2"],
        description: "Model to use for the analysis",
      },
      image: {
        type: "string",
        required: true,
        description: "Image URL for the model to process",
      },
    },
    response: {
      cost: {
        type: "number",
        description: "Cost of the request in USD",
      },
      description: {
        type: "string",
        description: "Description of the image",
      },
      text: {
        type: "string",
        description: "Text extracted from the image",
      },
      done: {
        type: "boolean",
        description: "Whether the request is done or not",
      },
    },
  },
  execute: async (data) => {
    let result = {
      description: null,
      text: null,
      cost: 0,
      done: false,
      record: null,
    };
    let { model, image } = data;
    let cost = 0;
    let event = new EventEmitter();
    event.emit("data", result);

    if (model.includes("blip2")) {
      upscale.execute({
        upscaler: "caption",
        image: image,
      }).then((ev) => {
        result.description = ""
        ev.on("data", (data) => {
          event.emit("data", result);
          if (data.status == "done") {
            result.description = data.result
            result.cost += data.cost;
            if (model.length == 1) result.done = true;
            event.emit("data", result);
          }
        });
      })

    }
    if (model.includes("ocr")) {
      // OCR_KEY
      axios({
        url: `https://api.ocr.space/parse/ImageUrl?url=${image}&OCREngine=1&scale=true`,
        method: "GET",
        headers: {
          apikey: process.env.OCR_KEY,
        },
      }).then((res) => {
        let body = res.data;
        const lines = body.ParsedResults[0].TextOverlay.Lines.map((l) => ({
          text: l.LineText,

          words: l.Words.map((w) => ({
            text: w.WordText,
            left: w.Left,
            top: w.Top,
            width: w.Width,
            height: w.Height,
          })),

          maxHeight: l.MaxHeight,
          minTop: l.MinTop,
        }));

        /* The entire detected text in the image */
        const text: string = body.ParsedResults[0].ParsedText.replaceAll(
          "\r\n",
          "\n"
        ).trim();

        result.text = text;
        result.cost += 0.00004;
        result.done = true;
        event.emit("data", result);
      });
    }
    result.record = {
      description: result.description,
      text: result.text,
      model: model,
      image: image,
    };
    event.emit("data", result);
    return event;
  },
};
