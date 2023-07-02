export default {
  data: {
    name: "anthropic",
    fullName: "Anthropic Models",
    disabled: true,
    parameters: {
      messages: {
        type: "array",
        required: false,
      },
      model: {
        type: "string",
        required: true,
        options: ["claude-v1", "claude-instant"],
        default: "claude-instant",
      },
      max_tokens: {
        type: "number",
        required: false,
        default: 512,
      },
      temperature: {
        type: "number",
        required: false,
        default: 0.9,
      },
    },
  },
  execute: async (data) => {
    throw new Error("Not implemented");
  },
};
