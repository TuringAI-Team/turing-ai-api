export default {
  data: {
    name: "anthropic",
    fullName: "Anthropic Models",
    parameters: {
      messages: {
        type: "array",
        required: false,
      },
      model: {
        type: "string",
        required: true,
        options: ["claude-v1", "claude-instant"],
      },
      max_tokens: {
        type: "number",
        required: false,
      },
      temperature: {
        type: "number",
        required: false,
      },
    },
  },
  execute: async (data) => {
    throw new Error("Not implemented");
  },
};
