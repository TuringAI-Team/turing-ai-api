export default {
  data: {
    name: "sh",
    parameters: {
      prompts: {
        type: "array",
        required: false,
      },
      image: {
        type: "string",
        required: false,
      },
      action: {
        type: "string",
        required: false,
        options: ["generate", "img2img", "upscale"],
      },
      width: {
        type: "number",
        required: false,
      },
      height: {
        type: "number",
        required: false,
      },
      steps: {
        type: "number",
        required: false,
      },
      number: {
        type: "number",
        required: false,
      },
      sampler: {
        type: "string",
        required: false,
        options: [
          "DDIM",
          "DDPM",
          "K_DPMPP_2M",
          "K_DPMPP_2S_ANCESTRAL",
          "K_DPM_2",
          "K_DPM_2_ANCESTRAL",
          "K_EULER",
          "K_EULER_ANCESTRAL",
          "K_HEUN",
          "K_LMS",
        ],
      },
      cfg_scale: {
        type: "number",
        required: false,
      },
      seed: {
        type: "number",
        required: false,
      },

      model: {
        type: "string",
        required: false,
      },
    },
  },
  execute: async (data) => {},
};
