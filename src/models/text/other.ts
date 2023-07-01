export default {
  data: {
    name: "other",
    fullName: "Other models",
    parameters: {
      messages: {
        type: "array",
        required: false,
      },
      prompt: {
        type: "string",
        required: false,
      },
      chat: {
        type: "boolean",
        required: false,
      },
      model: {
        type: "string",
        required: true,
        options: ["vicuna"],
      },
      max_tokens: {
        type: "number",
        required: false,
      },
    },
  },
  execute: async (data) => {},
};
