import axios from "axios";
import googleAPI from "googlethis";

export async function alan2(
  userName: string = "Anonymous",
  conversation,
  message: string,
  conversationId: string,
  searchEngine: string = "google",
  photo?: string,
  imageDescription?: any,
  imageGenerator?: string,
  nsfwFilter?: string,
  videoGenerator?: string,
  audioGenerator?: string,
  imageModificator?: string,
  pluginList?: string[],
  maxTokens: number = 200
) {}

const plugins = [
  {
    name: "google",
    description:
      "Searches Google to get updated information from internet, based on the user query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A very descriptive query for google search.",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      // use google-it
      const options = {
        page: 0,
        safe: false, // Safe Search
        parse_ads: false, // If set to true sponsored results will be parsed
        additional_params: {},
      };

      let response: any = await googleAPI.search(params.query, options);
      //  return first 2 results
      response.results = response.results.slice(0, 4);
      return response;
    },
  },
];
