import googleAPI from "googlethis";
import axios from "axios";
import yts from "yt-search";
import { evaluate, round } from "mathjs";
import { Octokit } from "@octokit/rest";
import { getCompilers, fromString } from "wandbox-api-updated";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import supabase from "../db/supabase.js";
import delay from "delay";
import { randomUUID } from "crypto";
import { run } from "@mermaid-js/mermaid-cli";
import sh from "../models/image/sh.js";

let compilers: any = await getCompilers();
compilers = compilers.map((c) => c.name);
// it has many versions of the same compiler, so we remove the duplicates and keep the latest version name is  language-version
let uniqueCompilers: any = [];
compilers = compilers.forEach((c: string, i: number) => {
  let [language, version] = c.split("-");
  if (uniqueCompilers.find((x) => x.language == language)) return;
  uniqueCompilers.push({
    language: language,
    version: version,
    full: c,
  });
});
compilers = uniqueCompilers;
compilers = compilers.map((c: any) => c.full);
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // token from github, you get it from your profile settings -> developer settings -> personal access tokens
});

const pluginList = [
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
      try {
        const response = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${params.topic}`
        );
        return response.data;
      } catch (e) {
        return "No results found";
      }
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
        if (action == "search") {
          result = result.data.items;
          console.log(result);
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
                name: r.owner?.login,
                url: r.owner?.html_url,
                type: r.owner?.type,
              },
            };
          });
          // just return the first 5 results
          result = result.slice(0, 5);
          // if length is 0 return error message
          if (result.length === 0) {
            result = { error: "No results found." };
          }
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
  {
    name: "code-interpreter",
    description: "Execute code in different languages using wandbox.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: `The language to execute the code in. It can only be ${compilers.join(
            ", "
          )}`,
        },
        code: {
          type: "string",
          description: "The code to execute.",
        },
      },

      required: ["language", "code"],
    },
    function: async (params) => {
      let language = params.language;
      let code = params.code;
      if (language == "javascript") language = "nodejs-16.14.0";

      let result: any = {};
      let compiler = compilers.find((c) => c.includes(language));
      if (compiler) {
        try {
          let response = await fromString({
            compiler: compiler,
            code: code,
            save: false,
          });

          result = response;
          result.display = "Display the program output in your reply message.";
        } catch (error) {
          result = { error: error };
        }
        return result;
      } else {
        return { error: "Invalid language." };
      }
    },
  },
  {
    name: "diagrams",
    description:
      "Get the instructions of how to generate diagrams, graph and mindmaps using mermaid.",
    secPlugin: "render-diagrams",
    parameters: {
      type: "object",
      properties: {
        diagramGuidelines: {
          type: "string",
          description: `The type of diagram to generate. It can only be graph. diagrams or mindmaps.`,
        },
      },
      required: ["diagramGuidelines"],
    },
    function: async (params) => {
      let res = {
        diagramType: params.diagramGuidelines,
        guidelines: {},
      };
      if (params.diagramGuidelines === "mindmaps") {
        res.guidelines = {
          diagramGuidelines:
            '\nRules when using mindmap diagrams in mermaid syntax:\n- Mermaid mindmaps can show nodes using different shapes. When specifying a shape for a node the syntax is similar to flowchart nodes, with an id followed by the shape definition and with the text within the shape delimiters. Where possible try to keep the same shapes as for flowcharts, even though they are not all supported from the start.\n\n- Mermaid mindmaps can show nodes using different shapes:\n  - square: `id[text]`\n  - rounded square: `id(I am a rounded square)`\n  - circle: `id((I am a circle))`\n  - bang: `id))I am a bang((`\n  - cloud: `id)I am a cloud(`\n  - hexagon: `id{{I am a hexagon}}`\n  - default shape: I am the default shape\n\nImportant rules when creating the mindmap diagram in mermaid syntax:\n- Root syntax:\n  - Only a single root is allowed; multiple roots are not allowed\n  - The root should have a meaningful title rather than just "TD"\n  - The root syntax is `root((my title))`. For instance, `root((Main Topic))`\n\n- The "Markdown Strings" feature enhances mind maps by offering a more versatile string type, which supports text formatting options such as bold and italics, and automatically wraps text within labels.\n```\nmindmap\n    id1["`**Root** with\na second line\nUnicode works too: 🤓`"]\n      id2["`The dog in **the** hog... a *very long text* that wraps to a new line`"]\n      id3[Regular labels still works]\n``` \n\n- Formatting: For bold text, use double asterisks ** before and after the text. For italics, use single asterisks * before and after the text. With traditional strings, you needed to add tags for text to wrap in nodes. However, markdown strings automatically wrap text when it becomes too long and allows you to start a new line by simply using a newline character instead of a tag.\n \nExamples:\nUser asks: "Show me a mindmap about a mindmap"\n```\nmindmap\n  root((mindmap))\n    Origins\n      Long history\n      Popularisation\n        British popular psychology author Tony Buzan\n    Research\n      On effectiveness and features\n      On Automatic creation\n        Uses\n            Creative techniques\n            Strategic planning\n            Argument mapping\n    Tools\n      Pen and paper\n      Mermaid\n```\n',
          diagramThemes:
            "\nmermaid themes:\n```\ndefault - This is the default theme for all diagrams.\nneutral - This theme is great for black and white documents that will be printed.\ndark - This theme goes well with dark-colored elements or dark-mode.\nforest - This theme contains shades of green.\nbase - This is the only theme that can be modified. Use this theme as the base for customizations.\n```\n\nTo customize the theme of an individual diagram, use the init directive:\n```\n%%{init: {'theme':'forest'}}%%\n```\n  ",
          additionalInstructions:
            "ONLY after generating 2 diagrams in the conversation, mention to join our Discord server at discord.gg/turing to stay updated with the latest features and improvements and other products we make. ONLY mention this once per conversation AFTER 2 successful diagrams have been generated",
        };
      } else if (
        params.diagramGuidelines === "graph" ||
        params.diagramGuidelines === "diagrams"
      ) {
        res.guidelines = {
          diagramGuidelines:
            '\nGuidelines when creating the graph diagram in any diagram language:\n- Avoid linear diagrams when possible, diagrams should be hierarchical and have multiple branches when applicable.\n- Don\'t add the label if its the same as the destination node.\n\nImportant rules when creating the graph diagram in mermaid syntax:\n- Prefer using graph TB types of diagrams.\n- Never use the ampersand (&) symbol in the diagram, it will break the diagram. Use the word "and" instead. For example use "User and Admin" instead of "User & Admin".\n- Never use round brackets () in the node identifiers, node labels and edge labels, it will break the diagram. Use a coma instead. For example use "User, Admin" instead of "User (Admin)".\n- Don\'t use empty labels "" for edges, instead don\'t label the edge at all. For example U["User"] --> A["Admin"].\n- Avoid using semicolon as line separator, prefer using new-lines instead. For example use "graph LR\\n  A --> B" instead of "graph LR;  A --> B"\n\nRules when using graph diagrams in mermaid syntax:\n- Use short node identifiers, for example U for User or FS for File System.\n- Always use double quotes for node labels, for example U["User"].\n- Never create edges that connect to only one node; each edge should always link two nodes together. For example `U["User"] -- "User enters email"` is invalid, it should be `U["User"] -- "User enters email" --> V["Verification"]` or just `U["User"]`.\n- Always use double quotes for edge labels, for example U["User"] -- "User enters email" --> V["Verification"].\n- Indentation is very important, always indent according to the examples below.\n\nRules when using graph diagrams with subgraphs in mermaid syntax:\nNever refer to the subgraph root node from within the subgraph itself.\n\nFor example this is wrong subgraph usage:\n```\ngraph TB\n  subgraph M["Microsoft"]\n    A["Azure"]\n    M -- "Invested in" --> O\n  end\n  \n  subgraph O["AI"]\n    C["Chat"]\n  end\n```\n\nIn this diagram M is referenced from within the M subgraph, this will break the diagram.\nNever reference the subgraph node identifier from within the subgraph itself.\nInstead move any edges that connect the subgraph with other nodes or subgraphs outside of the subgraph like so.\n\nCorrect subgraph usage:\n```\ngraph TB\n  subgraph M["Microsoft"]\n    A["Azure"]\n  end\n\n  M -- "Invested in" --> O\n  \n  subgraph O["OpenAI"]\n    C["ChatGPT"]\n  end\n```\n\nExamples:\nUser asks: "Show me how vscode internals work."\n```\ngraph TB\n  U["User"] -- "File Operations" --> FO["File Operations"]\n  U -- "Code Editor" --> CE["Code Editor"]\n  FO -- "Manipulation of Files" --> FS["FileSystem"]\n  FS -- "Write/Read" --> D["Disk"]\n  FS -- "Compress/Decompress" --> ZL["ZipLib"]\n  FS -- "Read" --> IP["INIParser"]\n  CE -- "Create/Display/Edit" --> WV["Webview"]\n  CE -- "Language/Code Analysis" --> VCA["VSCodeAPI"]\n  VCA -- "Talks to" --> VE["ValidationEngine"]\n  WV -- "Render UI" --> HC["HTMLCSS"]\n  VE -- "Decorate Errors" --> ED["ErrorDecoration"]\n  VE -- "Analyze Document" --> TD["TextDocument"]\n```\n\nUser asks: "Draw me a mindmap for beer brewing. Maximum of 4 nodes"\n```\ngraph TB\n  B["Beer"]\n  B --> T["Types"]\n  B --> I["Ingredients"]\n  B --> BP["Brewing Process"]\n```\n\nUser asks:\n"Computing backend data services is a distributed system made of multiple microservices.\n\nA web browser sends an HTTP api request to the load balancer.\nThe load balancer sends the http request to the crossover service.\nCrossover talks to redis and mysql database.\nCrossover makes a downstream API request to multiplex to submit the query which returns a job id to crossover.\nThen crossover makes a long poll API request to evaluator to get the results of the job.\nThen evaluator makes an API call to multiplex to check the status of the job.\nOnce evaluator gets a successful status response from multiplex, then evaluator makes a third API call to result-fetcher service to download the job results from S3 or GCP cloud buckets.\nThe result is streamed back through evaluator to crossover.\n\nCrossover post processes the result and returns the API response to the client.\n\nDraw me a diagram of this system"\n\n```\ngraph TB\n  A["Web Browser"] -- "HTTP API Request" --> B["Load Balancer"]\n  B -- "HTTP Request" --> C["Crossover"]\n  C -- "Talks to" --> D["Redis"]\n  C -- "Talks to" --> E["MySQL"]\n  C -- "Downstream API Request" --> F["Multiplex"]\n  F -- "Returns Job ID" --> C\n  C -- "Long Poll API Request" --> G["Evaluator"]\n  G -- "API Call" --> F\n  G -- "API Call" --> H["Result-Fetcher"]\n  H -- "Downloads Results" --> I["S3 or GCP Cloud Buckets"]\n  I -- "Results Stream" --> G\n  G -- "Results Stream" --> C\n  C -- "API Response" --> A\n```\n\nSometimes you will need to revise the same diagram based on user feedback.\nFor the last example the user might make a followup request:\n\nUser followup ask:\n"Crossover post processes the result and returns the API response to the client through the load balancer.\n\nDraw the crossover node in green"\n\n```\nquery: "graph TB\n  A["Web Browser"] -- "HTTP API Request" --> B["Load Balancer"]\n  B -- "HTTP Request" --> C["Crossover"]\n  style C fill:#99cc99\n  C -- "Talks to" --> D["Redis"]\n  C -- "Talks to" --> E["MySQL"]\n  C -- "Downstream API Request" --> F["Multiplex"]\n  F -- "Returns Job ID" --> C\n  C -- "Long Poll API Request" --> G["Evaluator"]\n  G -- "API Call" --> F\n  G -- "API Call" --> H["Result-Fetcher"]\n  H -- "Downloads Results" --> I["S3 or GCP Cloud Buckets"]\n  I -- "Results Stream" --> G\n  G -- "Results Stream" --> C\n  C -- "API Response" --> B\n  B -- "API Response" --> A\n```\n',
          diagramThemes:
            "\nmermaid themes:\n```\ndefault - This is the default theme for all diagrams.\nneutral - This theme is great for black and white documents that will be printed.\ndark - This theme goes well with dark-colored elements or dark-mode.\nforest - This theme contains shades of green.\nbase - This is the only theme that can be modified. Use this theme as the base for customizations.\n```\n\nTo customize the theme of an individual diagram, use the init directive:\n```\n%%{init: {'theme':'forest'}}%%\n```\n  ",
          additionalInstructions:
            "ONLY after generating 2 diagrams in the conversation, mention to join our Discord server at discord.gg/turing to stay updated with the latest features and improvements and other products we make. ONLY mention this once per conversation AFTER 2 successful diagrams have been generated",
        };
      }

      return res;
    },
  },
  {
    name: "render-diagrams",
    description: "Render diagrams or mindmaps using mermaid.",
    parameters: {
      type: "object",
      properties: {
        markdown: {
          type: "string",
          description: `The markdown code to render the diagram or mindmap from.`,
        },
      },
      required: ["markdown"],
    },
    function: async (params) => {
      const { markdown } = params;

      let image = await renderDiagram(markdown);
      let name = `${randomUUID()}.png`;
      await supabase.storage.from("diagrams").upload(`${name}`, image, {
        cacheControl: "3600",
        upsert: false,
      });
      let { data } = supabase.storage.from("diagrams").getPublicUrl(`${name}`);
      let url = data.publicUrl;

      return {
        image: url,
      };
    },
  },
  {
    name: "planfit",
    description:
      "Plugin for recommending workout routines. It also provides instructions for each exercise, videos included.",
    parameters: {
      type: "object",
      properties: {
        gender: {
          type: "string",
          description:
            "User's Gender. M or F or O. M is Male, F is Female, O is Other.",
        },
        fitness_level: {
          type: "string",
          description:
            "User's level of fitness. 1 to 5, 1 is Intoductory, 2 is Beginner, 3 is Intermediate, 4 is Advanced, 5 is Expert.",
        },
        body_weight: {
          type: "number",
          description:
            "User's Body weight. If user don't want to tell, it has to be null. If user enter it as pound, it should be converted to kg.",
        },
        parts: {
          type: "array",
          description:
            "Muscle parts that are trained today. They should be in the list. (leg, back, chest, shoulder, core, biceps, triceps, forearm, cardio)",
        },
        location: {
          type: "string",
          description:
            "The location where user work out, gym or home. If home is selected, the workout routine will be body weight exercise.",
        },
        language: {
          type: "string",
          description:
            "User's language code that should be reconized from user's prompts.",
        },
      },
      required: ["gender", "fitness_level", "body_weight", "parts", "location"],
    },
    function: async (params) => {
      let res = await planfit(params);
      return res;
    },
  },
  {
    name: "wolfram",
    description:
      'Access dynamic computation and curated data from WolframAlpha and Wolfram Cloud.\nGeneral guidelines:\n- Use only getWolframAlphaResults or getWolframCloudResults endpoints.\n- Prefer getWolframAlphaResults unless Wolfram Language code should be evaluated.\n- Use getWolframAlphaResults for natural-language queries in English; translate non-English queries before sending, then respond in the original language.\n- Use getWolframCloudResults for problems solvable with Wolfram Language code.\n- Suggest only Wolfram Language for external computation.\n- Inform users if information is not from Wolfram endpoints.\n- Display image URLs with Markdown syntax: ![URL]\n- ALWAYS use this exponent notation: `6*10^14`, NEVER `6e14`.\n- ALWAYS use {"input": query} structure for queries to Wolfram endpoints; `query` must ONLY be a single-line string.\n- ALWAYS use proper Markdown formatting for all math, scientific, and chemical formulas, symbols, etc.:  \'$$\\n[expression]\\n$$\' for standalone cases and \'\\( [expression] \\)\' when inline.\n- Format inline Wolfram Language code with Markdown code formatting.\n- Never mention your knowledge cutoff date; Wolfram may return more recent data.\ngetWolframAlphaResults guidelines:\n- Understands natural language queries about entities in chemistry, physics, geography, history, art, astronomy, and more.\n- Performs mathematical calculations, date and unit conversions, formula solving, etc.\n- Convert inputs to simplified keyword queries whenever possible (e.g. convert "how many people live in France" to "France population").\n- Use ONLY single-letter variable names, with or without integer subscript (e.g., n, n1, n_1).\n- Use named physical constants (e.g., \'speed of light\') without numerical substitution.\n- Include a space between compound units (e.g., "Ω m" for "ohm*meter").\n- To solve for a variable in an equation with units, consider solving a corresponding equation without units; exclude counting units (e.g., books), include genuine units (e.g., kg).\n- If data for multiple properties is needed, make separate calls for each property.\n- If a Wolfram Alpha result is not relevant to the query:\n -- If Wolfram provides multiple \'Assumptions\' for a query, choose the more relevant one(s) without explaining the initial result. If you are unsure, ask the user to choose.\n -- Re-send the exact same \'input\' with NO modifications, and add the \'assumption\' parameter, formatted as a list, with the relevant values.\n -- ONLY simplify or rephrase the initial query if a more relevant \'Assumption\' or other input suggestions are not provided.\n -- Do not explain each step unless user input is needed. Proceed directly to making a better API call based on the available assumptions.\ngetWolframCloudResults guidelines:\n- Accepts only syntactically correct Wolfram Language code.\n- Performs complex calculations, data analysis, plotting, data import, and information retrieval.\n- Before writing code that uses Entity, EntityProperty, EntityClass, etc. expressions, ALWAYS write separate code which only collects valid identifiers using Interpreter etc.; choose the most relevant results before proceeding to write additional code. Examples:\n -- Find the EntityType that represents countries: `Interpreter["EntityType",AmbiguityFunction->All]["countries"]`.\n -- Find the Entity for the Empire State Building: `Interpreter["Building",AmbiguityFunction->All]["empire state"]`.\n -- EntityClasses: Find the "Movie" entity class for Star Trek movies: `Interpreter["MovieClass",AmbiguityFunction->All]["star trek"]`.\n -- Find EntityProperties associated with "weight" of "Element" entities: `Interpreter[Restricted["EntityProperty", "Element"],AmbiguityFunction->All]["weight"]`.\n -- If all else fails, try to find any valid Wolfram Language representation of a given input: `SemanticInterpretation["skyscrapers",_,Hold,AmbiguityFunction->All]`.\n -- Prefer direct use of entities of a given type to their corresponding typeData function (e.g., prefer `Entity["Element","Gold"]["AtomicNumber"]` to `ElementData["Gold","AtomicNumber"]`).\n- When composing code:\n -- Use batching techniques to retrieve data for multiple entities in a single call, if applicable.\n -- Use Association to organize and manipulate data when appropriate.\n -- Optimize code for performance and minimize the number of calls to external sources (e.g., the Wolfram Knowledgebase)\n -- Use only camel case for variable names (e.g., variableName).\n -- Use ONLY double quotes around all strings, including plot labels, etc. (e.g., `PlotLegends -> {"sin(x)", "cos(x)", "tan(x)"}`).\n -- Avoid use of QuantityMagnitude.\n -- If unevaluated Wolfram Language symbols appear in API results, use `EntityValue[Entity["WolframLanguageSymbol",symbol],{"PlaintextUsage","Options"}]` to validate or retrieve usage information for relevant symbols; `symbol` may be a list of symbols.\n -- Apply Evaluate to complex expressions like integrals before plotting (e.g., `Plot[Evaluate[Integrate[...]]]`).\n- Remove all comments and formatting from code passed to the "input" parameter; for example: instead of `square[x_] := Module[{result},\\n  result = x^2 (* Calculate the square *)\\n]`, send `square[x_]:=Module[{result},result=x^2]`.\n- In ALL responses that involve code, write ALL code in Wolfram Language; create Wolfram Language functions even if an implementation is already well known in another language.\n',
    parameters: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description:
            "Type of request, can be 'cloud-plugin' or 'llm-api'. Usages:\n'cloud-plugin':Evaluate Wolfram Language code.\n 'llm-api':Get Wolfram|Alpha results.",
        },
        input: {
          type: "string",
          description: "The input expression.",
        },
        assumption: {
          type: "string",
          description:
            "Just for 'llm-api', the assumption to use, passed back from a previous query with the same input.",
        },
      },
      required: ["request", "input"],
    },
    function: async (parameters) => {
      if (parameters.request == "cloud-plugin") {
        let res = await axios({
          url: "https://www.wolframalpha.com/api/v1/cloud-plugin",
          method: "get",
          params: {
            input: parameters.input,
          },
        });
        console.log(res.data);
        return res.data;
      } else if (parameters.request == "llm-api") {
        let res = await axios({
          url: "https://www.wolframalpha.com/api/v1/llm-api",
          method: "get",
          params: {
            input: parameters.input,
            assumption: parameters.assumption,
          },
        });
        console.log(res.data);
        return res.data;
      }
    },
  },
  {
    name: "image",
    description:
      "Plugin for generating images using prompts. This uses different AI models to generate images.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Image generation prompt with fitting & descriptive keywords. Keep the description below 70 characters",
        },
      },
      required: ["prompt"],
    },
    function: async (parameters) => {
      let { prompt, model } = parameters;
      if (!model || model == "sdxl") {
        let event = await sh.execute({
          prompt: prompt,
          model: "SDXL_beta::stability.ai#6901",
          number: 2,
          nsfw: false,
        });
        let r: any = {};
        // await until event sent done
        await new Promise((resolve, reject) => {
          event.on("data", (d) => {
            if (d.done) {
              r = d;
              resolve(d);
            }
          });
        });
        let result = r.result[0];
        let base64 = result.base64;
        // convert base64 to url
        let buffer = Buffer.from(base64, "base64");
        await supabase.storage
          .from("images")
          .upload(`${result.id}.png`, buffer);
        let { data } = await supabase.storage
          .from("images")
          .getPublicUrl(`${result.id}.png`);
        return data.publicUrl;
      }
    },
  },
  {
    name: "music",
    description: "Plugin for generating music using prompts.",
  },
];

// Render the diagram as an image
async function renderDiagram(diagramCode) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  await page.setContent(`
        <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        </head>
        <body>
            <pre class="mermaid">
              ${diagramCode}
            </pre>

          <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ startOnLoad: true });
          </script>
        </body>
        </html>
      `);
  // wait  30s
  await delay(2000);
  // take screenshot
  let ss = await page.screenshot({ type: "png" });

  await browser.close();

  return ss;
}

async function planfit(data: {
  gender: string;
  fitness_level: string;
  body_weight: number;
  parts: string[];
  location: string;
  language: string;
}) {
  let res = await axios({
    method: "post",
    url: "https://chatgptplugin.planfit.ai/get-workout-routine",
    data: {
      gender: data.gender,
      fitness_level: data.fitness_level,
      body_weight: data.body_weight,
      parts: data.parts,
      location: data.location,
      user_language_code: data.language,
    },
  });
  return res.data;
}

export default pluginList;
