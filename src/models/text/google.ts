import axios from "axios";
export default {
  data: {
    name: "google",
    fullName: "Google Models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },

      model: {
        type: "string",
        required: true,
        options: ["chat-bison"],
        default: "chat-bison",
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
    let { messages, model, max_tokens, temperature } = data;
    // get message that is message.role == "system"
    let message = messages.find((message) => message.role == "system");
    messages = messages.map((message) => {
      if (message.role != "system") {
        return {
          content: message.content,
          author: message.role == "user" ? "user" : "bot",
        };
      }
    });
    let response = await axios({
      method: "post",
      url: `https://us-central1-aiplatform.googleapis.com/v1/projects/turingai-4354f/locations/us-central1/publishers/google/models/${
        model == "chat-bison" ? "chat-bison@001" : "chat-bison@001"
      }:predict`,
      headers: {
        Authorization: `Bearer ${process.env.GCLOUD_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        instances: [
          {
            context: message
              ? message.content
              : "You are PaLM 2 a AI chatbot created by Google.",
            messages: messages,
            examples: [],
          },
        ],
        parameters: {
          temperature: temperature || 0.2,
          maxOutputTokens: max_tokens || 250,
          topP: 0.8,
          topK: 40,
        },
      },
    });
    console.log(response.data);
    return response.data;
  },
};
