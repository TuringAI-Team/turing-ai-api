import axios from "axios";
import { request, translateModels } from "../../utils/runpod.js";

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
  },
  execute: async (data) => {
    let result = {
      description: null,
      text: null,
    };
    let { model, image } = data;
    if (model.includes("blip2")) {
      let url = await translateModels("blip2");
      let res = await request(url, `runsync`, {
        input: {
          data_url: image,
        },
      });
      if (res.output) {
        result.description = res.output.captions[0].caption;
      }
    } else if (model.includes("ocr")) {
      // OCR_KEY
      let res = await axios({
        url: `https://api.ocr.space/parse/ImageUrl?url=${image}&OCREngine=1&scale=true`,
        method: "GET",
        headers: {
          apikey: process.env.OCR_KEY,
        },
      });
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
    }
    return result;
  },
};
