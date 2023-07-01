import axios from "axios";

export default {
  data: {
    name: "translate",
    fullName: "Translate text",
    parameters: {
      text: {
        type: "string",
        required: true,
      },
      from: {
        type: "string",
        required: false,
      },
      to: {
        type: "string",
        required: true,
      },
      ai: {
        type: "string",
        required: true,
        options: ["google", "microsoft"],
      },
    },
  },
  execute: async (data) => {
    let { text, from, to } = data;
    let endpoint = "gtranslate";
    if (data.ai) endpoint = "mtranslate";
    let response = await axios({
      url: "https://api.pawan.krd/gtranslate",
      method: "GET",
      params: {
        text,
        from,
        to,
      },
    });
    return response.data;
  },
};
