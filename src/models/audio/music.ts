export default {
  data: {
    name: "music",
    fullName: "Music generation",
    parameters: {
      prompt: {
        type: "string",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        options: ["small", "medium", "melody", "large"],
        default: "small",
      },
      duration: {
        type: "number",
        required: false,
        default: 8,
      },
    },
  },
  execute: async (data) => {},
};
