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
        options: ["blip2", "ocr", "gemini"],
        default: ["gemini"],
        description: "Model to use for the analysis",
      },
      image: {
        type: "string",
        required: true,
        description: "Image URL for the model to process",
      },
      typeImage: {
        type: "string",
        required: false,
        options: ["anything", "person"],
        default: "anything",
        description: "Type of image to process",
      }
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
      lines: null,
      record: null,
    };
    let { model, image, typeImage } = data;
    let cost = 0;
    let event = new EventEmitter();
    event.emit("data", result);

    if (model.includes("blip2")) {
      upscale
        .execute({
          upscaler: "caption",
          image: image,
        })
        .then((ev) => {
          result.description = "";
          ev.on("data", (data) => {
            event.emit("data", result);
            if (data.status == "done") {
              result.description = data.result;
              result.cost += data.cost;
              if (model.length == 1 || result.text) result.done = true;
              event.emit("data", result);
            }
          });
        })
        .catch((e) => {
          console.log(e);
        });
    }
    if (model.includes("ocr")) {
      // OCR_KEY
      axios({
        url: `https://api.ocr.space/parse/ImageUrl`,
        method: "GET",
        headers: {
          apikey: process.env.OCR_KEY,
        },
        params: {
          url: image,
          apikey: process.env.OCR_KEY,
        },
      }).then((res) => {
        let body = res.data;
        if (!body.ParsedResults || body.ParsedResults?.length == 0) {
          console.log(body);
          if (model.length == 1 || result.description) {
            result.done = true;
          }
          event.emit("data", result);
          return;
        }
        const lines = body.ParsedResults[0]?.TextOverlay?.Lines?.map((l) => ({
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
        result.lines = lines;
        if (model.length == 1 || result.description) {
          result.done = true;
        }
        event.emit("data", result);
      });
    }
    if (model.includes("gemini")) {
      let prompt = `Don't forget these rules:\n\n1. **Be Direct and Concise**: Provide straightforward descriptions without adding interpretative or speculative elements.\n2. **Use Segmented Details**: Break down details about different elements of an image into distinct sentences, focusing on one aspect at a time.\n3. **Maintain a Descriptive Focus**: Prioritize purely visible elements of the image, avoiding conclusions or inferences.\n4. **Follow a Logical Structure**: Begin with the central figure or subject and expand outward, detailing its appearance before addressing the surrounding setting.\n5. **Avoid Juxtaposition**: Do not use comparison or contrast language; keep the description purely factual.\n6. **Incorporate Specificity**: Mention age, gender, race, and specific brands or notable features when present, and clearly identify the medium if it's discernible.\n\nWhen writing descriptions, prioritize clarity and direct observation over embellishment or interpretation.\n\n   Write a detailed description of this image, do not forget about the texts on it if they exist. Also, do not forget to mention the type / style of the image. No bullet points.`
      if (typeImage == "person") {
        prompt = "Describe with high details which emotions the person in the picture seems to be experiencing from what the micro expressions in the face and the body language seem to indicate. Write only details that can be clearly observed and draw conclusions from this that have visible evidence in the picture. Also consider if the person could be trying to convey other emotions to his/her social environment than he/she is actually feeling by looking for close how genuine the displayed emotions seems to be. Provide a detailed reply that reflects high emotional intelligence, empathy and accuracy. "
      }

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
