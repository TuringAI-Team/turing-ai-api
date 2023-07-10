export default {
  data: {
    name: "zelescope",
    fullName: "Zelescope",
    alert: "This model is not yet implemented",
    parameters: {
      prompt: {
        type: "string",
        required: true,
      },
      duration: {
        type: "number",
        required: false,
        default: 10,
      },
    },
  },
  execute: async (data) => {},
};
