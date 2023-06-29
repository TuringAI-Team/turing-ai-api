export default {
  data: {
    name: "alan",
    parameters: {
      userName: {
        type: "string",
        required: true,
      },
      conversationId: {
        type: "string",
        required: true,
      },
      message: {
        type: "string",
        required: true,
      },
      searchEngine: {
        type: "string",
        required: false,
      },
      photo: {
        type: "string",
        required: false,
      },
      photoDescription: {
        type: "string",
        required: false,
      },
      imageGenerator: {
        type: "string",
        required: false,
      },
      nsfwFilter: {
        type: "boolean",
        required: false,
      },
      videoGenerator: {
        type: "string",
        required: false,
      },
      audioGenerator: {
        type: "string",
        required: false,
      },
      imageModificator: {
        type: "string",
        required: false,
      },
      maxTokens: {
        type: "number",
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
