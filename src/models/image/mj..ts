export default {
  data: {
    name: "mj",
    parameters: {
      prompt: {
        type: "string",
        required: false,
      },
      model: {
        type: "string",
        required: false,
        options: ["1", "2", "3", "4", "5", "5.1", "5.2", "niji"],
      },
      action: {
        type: "string",
        required: false,
        options: ["imagine", "variation", "upscale"],
      },
      number: {
        type: "number",
        required: false,
        options: [0, 1, 2, 3],
      },
      id: {
        type: "string",
        required: false,
      },
      stream: {
        type: "boolean",
        required: false,
      },
    },
  },
  execute: async (data) => {},
};
