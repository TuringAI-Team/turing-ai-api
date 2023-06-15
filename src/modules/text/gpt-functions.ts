import { Configuration, OpenAIApi } from "openai";
import googleAPI from "googlethis";
import { EventEmitter } from "events";
import axios from "axios";
import { fetchEventSource } from "@waylaidwanderer/fetch-event-source";
import yts from "yt-search";
import { get_encoding } from "@dqbd/tiktoken";
import { getChatMessageLength } from "./langchain.js";
export const encoder = get_encoding("cl100k_base");
import { evaluate, round } from "mathjs";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // token from github, you get it from your profile settings -> developer settings -> personal access tokens
});

export async function pluginsChat(config, plugins) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const event = new EventEmitter();
  const openai = new OpenAIApi(configuration);
  let functions = [];
  let messages = config.messages;
  delete config.messages;
  let result = {
    result: "",
    done: false,
    tool: null,
    credits: 0,
  };

  for (let i = 0; i < plugins.length; i++) {
    let plugin = pluginList.find((p) => p.name === plugins[i]);
    if (plugin) {
      functions.push(plugin);
    }
  }
  event.emit("data", result);
  openai
    .createChatCompletion({
      ...config,
      messages: messages,
      functions: functions,
      function_call: "auto",
    })
    .then(async (completion) => {
      let message = completion.data.choices[0].message;
      let pricePerK = 0.002;
      if (config.model.includes("gpt-4")) pricePerK = 0.05;
      result.credits += (completion.data.usage.total_tokens / 1000) * pricePerK;
      if (message["function_call"]) {
        let functionName = message["function_call"]["name"];
        result.tool = functionName;
        event.emit("data", result);
        let pluginInfo = pluginList.find((p) => p.name === functionName);
        let args = JSON.parse(message["function_call"]["arguments"]);
        if (
          !pluginInfo.parameters.required ||
          (args[pluginInfo.parameters.required[0]] &&
            pluginInfo.parameters.required.length > 0) ||
          pluginInfo.parameters.required.length == 0
        ) {
          console.log(`args ${JSON.stringify(args)}`);
          let pluginResponse = await pluginInfo.function(args);
          console.log(`pluginResponse ${JSON.stringify(pluginResponse)}`);
          let body = {
            ...config,
            messages: [
              ...messages,
              {
                role: "function",
                name: functionName,
                content: JSON.stringify(pluginResponse),
              },
            ],
            stream: true,
          };
          await fetchEventSource("	https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(body),
            onmessage: async (ev) => {
              let data: any = ev.data;
              if (data == "[DONE]") {
                result.done = true;
                result.credits +=
                  (getPromptLength(result.result) / 1000) * pricePerK;
                result.credits +=
                  (getChatMessageLength(messages) / 1000) * pricePerK;
                event.emit("data", result);
              } else {
                data = JSON.parse(data);
                if (data.choices[0].delta.content) {
                  result.result += data.choices[0].delta.content;
                }
                event.emit("data", result);
              }
            },
          });
        }
      } else {
        result.result = message.content;
        result.done = true;
        event.emit("data", result);
      }
    })
    .catch((err) => {
      console.log(`err ${err}`);
      result.done = true;
      event.emit("data", result);
    });
  return event;
}
export const getPromptLength = (content: string): number => {
  content = content
    .replaceAll("<|endoftext|>", "<|im_end|>")
    .replaceAll("<|endofprompt|>", "<|im_end|>");
  return encoder.encode(content).length;
};
let pluginList = [
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
  {
    name: "youtube-search",
    description:
      "Searches youtube videos to display the most relevant videos based on the user query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A very descriptive query for youtube search.",
        },
        count: {
          type: "number",
          description: "Number of videos to return. Default is 3",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      const r = await yts(params.query);
      let videos = r.videos.slice(0, params.count || 3);
      return videos;
    },
  },
  {
    name: "weather",
    description:
      "Get weather information for a specific location using open weather map.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "Location for openweathermap to get weather information. It needs to be the name of a real location that openweathermap can find.",
        },
      },
      required: ["location"],
    },
    function: async (params) => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${params.location}&appid=${process.env.OPEN_WEATHER}`
      );
      return response.data;
    },
  },
  {
    name: "wikipedia",
    description: "Get wikipedia information for a specific topic.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic to get wikipedia information.",
        },
      },
      required: ["topic"],
    },
    function: async (params) => {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${params.topic}`
      );
      return response.data;
    },
  },
  {
    name: "tenor",
    description: "Get a gif from tenor based on a specific query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Query to get a gif from tenor.",
        },
        limit: {
          type: "number",
          description: "Number of gifs to return. Default is 3",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      let limit = params.limit || 3;
      const response = await axios.get(
        `https://tenor.googleapis.com/v2/search?q=${params.query}&limit=${limit}&key=${process.env.TENOR_KEY}`
      );
      let data = response.data;
      let gifs = data.results.map((gif: any) => {
        return {
          url: gif.url,
          title: gif.title,
          content_description: gif.content_description,
        };
      });
      return gifs;
    },
  },
  {
    name: "alphavantage-stocks",
    description:
      "Get stock information for a specific stock using alphavantage.",
    parameters: {
      type: "object",
      properties: {
        stock: {
          type: "string",
          description: "Stock symbol to get information from.",
        },
      },
      required: ["stock"],
    },
    function: async (params) => {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${params.stock}&apikey=${process.env.ALPHA_VANTAGE}`
      );
      return response.data;
    },
  },
  {
    name: "alphavantage-crypto",
    description:
      "Get crypto information for a specific crypto using alphavantage.",
    parameters: {
      type: "object",
      properties: {
        from_currency: {
          type: "string",
          description: "Crypto symbol to get information from.",
        },
        to_currency: {
          type: "string",
          description: "Currency to convert crypto to.",
        },
      },
      required: ["from_currency"],
    },
    function: async (params) => {
      let to_currency = params.to_currency || "USD";
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${params.from_currency}&to_currency=${to_currency}&apikey=${process.env.ALPHA_VANTAGE}`
      );
      return response.data;
    },
  },
  {
    name: "alphavantage-forex",
    description:
      "Get forex information for a specific forex using alphavantage.",
    parameters: {
      type: "object",
      properties: {
        from_currency: {
          type: "string",
          description: "Forex symbol to get information from.",
        },
        to_currency: {
          type: "string",
          description: "Currency to convert forex to.",
        },
      },
      required: ["from_currency"],
    },
    function: async (params) => {
      let to_currency = params.to_currency || "USD";
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${params.from_currency}&to_currency=${to_currency}&apikey=${process.env.ALPHA_VANTAGE}`
      );
      return response.data;
    },
  },
  {
    name: "free-games",
    description: "Get free games from different platforms or categories.",
    parameters: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform to get free games from.",
        },
        category: {
          type: "string",
          description:
            "Category to get free games from. Complete list: mmorpg, shooter, strategy, moba, racing, sports, social, sandbox, open-world, survival, pvp, pve, pixel, voxel, zombie, turn-based, first-person, third-Person, top-down, tank, space, sailing, side-scroller, superhero, permadeath, card, battle-royale, mmo, mmofps, mmotps, 3d, 2d, anime, fantasy, sci-fi, fighting, action-rpg, action, military, martial-arts, flight, low-spec, tower-defense, horror, mmorts",
        },
      },
    },
    function: async (params) => {
      let platform = params.platform || "pc";
      let category = params.category || "mmorpg";
      const response = await axios.get(
        `https://www.freetogame.com/api/games?${
          params.platform ? `platform=${platform}` : ""
        }${params.category ? `&category=${category}` : ""}`
      );
      return response.data;
    },
  },
  {
    name: "tasty",
    description: "Get recipes from tasty.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Query to get recipes from tasty.",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      let query = params.query;
      const response = await axios({
        url: `https://api.tasty.co/openai/recipes/query`,
        method: "post",
        data: {
          queries: [query],
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    },
  },
  {
    name: "world-news",
    description:
      "Get world news with specific country, language or text using worldnewsapi.com. With this function you can provide real-time news updates.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to match in the news content.",
        },
        "source-countries": {
          type: "string",
          description:
            "A comma-separated list of ISO 3166 country codes from which the news should originate.",
        },
        language: {
          type: "string",
          description: "The ISO 6391 language code of the news.",
        },
        number: {
          type: "number",
          description:
            "The number of news to return. The default is 5. The max is 12.",
        },
      },
    },
    function: async (params) => {
      let text = params.text;
      let sourceCountries = params["source-countries"];
      let language = params.language;
      let number = params.number || 5;

      let p = {};
      if (text) {
        p["text"] = text;
      }
      if (sourceCountries) {
        p["source-countries"] = sourceCountries.toLowerCase();
      }
      if (language) {
        p["language"] = language.toLowerCase();
      }
      if (number) {
        p["number"] = number;
      }
      try {
        const response = await axios({
          url: `https://api.worldnewsapi.com/search-news?api-key=${process.env.WORLD_NEWS_API}`,
          method: "get",
          params: p,
          headers: {
            "x-api-key": process.env.WORLD_NEWS_API,
            "Content-Type": "application/json",
          },
        });

        let data = JSON.parse(JSON.stringify(response.data));
        let news = data.news.map((n) => {
          return {
            title: n.title,
            url: n.url,
            summary: n.summary,
            image: n.image,
            language: n.language,
            source_country: n.source_country,
            author: n.author,
          };
        });
        return news;
      } catch (error) {
        console.log(`error: ${error}`);
        return {};
      }
    },
  },
  {
    name: "calculator",
    description: "Calculate a math expression using mathjs evaluate function.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The math expression to evaluate.",
        },
        precision: {
          type: "number",
          description: "The number of digits to round to.",
        },
      },
      required: ["expression"],
    },
    function: async (params) => {
      let expression = params.expression;
      let precision = params.precision || 14;
      let result = evaluate(expression);
      return round(result, precision);
    },
  },
  {
    name: "github",
    description:
      "Execute actions in github using octokit such as searching for topics,users or repos, or getting information from users or repos.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The action to execute in github. (search, get)",
        },
        type: {
          type: "string",
          description:
            "The type of action to execute in github. (topic, user, repo, org)",
        },
        query: {
          type: "string",
          description:
            "The query to search in github. Or the username or repo name to get information from.",
        },
      },
      required: ["action", "type", "query"],
    },
    function: async (params) => {
      let action = params.action;
      let type = params.type;
      let query = params.query;
      let result: any = {};
      if (action === "search") {
        if (type === "topic") {
          result = await octokit.rest.search.topics({ q: query });
        } else if (type === "user") {
          result = await octokit.rest.search.users({ q: query });
        } else if (type === "repo") {
          result = await octokit.rest.search.repos({ q: query });
        } else {
          result = { error: "Invalid type." };
        }
      } else if (action === "get") {
        if (type === "user") {
          result = await octokit.rest.users.getByUsername({ username: query });
        } else if (type === "repo") {
          result = await octokit.rest.repos.get({
            owner: query.split("/")[0],
            repo: query.split("/")[1],
          });
        } else if (type === "org") {
          result = await octokit.rest.orgs.get({ org: query });
        } else {
          result = { error: "Invalid type." };
        }
      } else {
        result = { error: "Invalid action." };
      }
      if (!result.error) {
        // format data
        console.log(result);
        if (action == "search") {
          result = result.data.items;
          result = result.map((r) => {
            return {
              name: r.name,
              full_name: r.full_name,
              url: r.html_url,
              created_at: r.created_at,
              updated_at: r.updated_at,
              size: r.size,
              forks_count: r.forks_count,
              open_issues_count: r.open_issues_count,
              license: r.license,
              private: r.private,
              owner: {
                name: r.owner.login,
                url: r.owner.html_url,
                type: r.owner.type,
              },
            };
          });
          // just return the first 5 results
          result = result.slice(0, 5);
        }
        if (action == "get") {
          result = result.data;
          result = {
            name: result.login,
            url: result.html_url,
            type: result.type,
            company: result.company,
            blog: result.blog,
            location: result.location,
            bio: result.bio,
            twitter_username: result.twitter_username,
            created_at: result.created_at,
            updated_at: result.updated_at,
            public_repos: result.public_repos,
            followers: result.followers,
            following: result.following,
          };
        }
      }
      return result;
    },
  },
];
