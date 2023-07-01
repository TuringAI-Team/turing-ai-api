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
      },
      negative_prompt: {
        type: "string",
        required: false,
      },
      guidance_scale: {
        type: "number",
        required: false,
      },
    },
  },
  execute: async (data) => {
    let { prompt, steps, negative_prompt, guidance_scale } = data;
    if (!negative_prompt)
      negative_prompt =
        "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces";
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
      },
    });
    return response.data;
  },
};
