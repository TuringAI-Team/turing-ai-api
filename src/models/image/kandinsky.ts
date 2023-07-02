import axios from "axios";

export default {
  data: {
    name: "kandinsky",
    fullName: "Kandinsky 2.1",
    parameters: {
      prompt: {
        type: "string",
        required: false,
      },
      steps: {
        type: "number",
        required: false,
        default: 100,
      },
      number: {
        type: "number",
        required: false,
        default: 1,
      },
      negative_prompt: {
        type: "string",
        required: false,
      },
      guidance_scale: {
        type: "number",
        required: false,
        default: 4,
      },
    },
  },
  execute: async (data) => {
    let { prompt, steps, negative_prompt, guidance_scale } = data;
    if (!negative_prompt)
      negative_prompt =
        "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces";
    let start = Date.now();
    let response = await axios({
      url: "https://api.runpod.ai/v2/kandinsky-v2/runsync",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_KEY}`,
      },
      data: {
        prompt: prompt,
        steps: steps,
        guidance_scale: guidance_scale,
        negative_prompt: negative_prompt,
        num_images: data.number || 1,
      },
    });
    let spentInSec = (Date.now() - start) / 1000;
    let cost = spentInSec * 0.00025;
    let result = {
      cost: cost,
      images: [],
    };
    if (data.number && data.number > 1) {
      result.images = await Promise.all(
        response.data.output.images.map(async (x) => {
          let res = await axios.get(x, {
            responseType: "arraybuffer",
          });
          let base64 = Buffer.from(res.data, "binary").toString("base64");
          return {
            base64: base64,
            seed: Math.floor(Math.random() * 100000000),
          };
        })
      );
    } else {
      let res = await axios.get(response.data.output.image_url, {
        responseType: "arraybuffer",
      });
      let base64 = Buffer.from(res.data, "binary").toString("base64");
      result.images.push({
        base64: base64,
        seed: Math.floor(Math.random() * 100000000),
      });
    }
    return result;
  },
};
