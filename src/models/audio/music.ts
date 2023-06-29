export default {
  data: {
    name: "music",
    parameters: {
      prompt: {
        type: "string",
        required: false,
      },
      model: {
        type: "string",
        required: true,
        options: ["small", "medium", "melody", "large"],
      },
      duration: {
        type: "number",
        required: false,
      },
    },
  },
  execute: async (data) => {},
};
