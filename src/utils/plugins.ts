import googleAPI from "googlethis";
import axios from "axios";
import yts from "yt-search";
import { evaluate, round } from "mathjs";
import { Octokit } from "@octokit/rest";
import { getCompilers, fromString } from "wandbox-api-updated";
import puppeteer from "puppeteer";
import supabase from "../db/supabase.js";
import delay from "delay";

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
      let compiler = compilers.find((c) => c === language);
      if (compiler) {
        try {
          let response = await fromString({
            compiler: compiler,
            code: code,
            save: false,
          });

          result = response;
          result.display = true;
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
      "Generate diagrams using mermaid. It returns the image url you can use to display the diagram. For displaying the diagram JUST WRITE THE IMAGE URL you receive.",
    parameters: {
      type: "object",
      properties: {
        markdownDiagram: {
          type: "string",
          description: "The markdown diagram to generate.",
        },
        // diagrams do not exist
      },
      required: ["markdownDiagram"],
    },
    function: async (params) => {
      let markdownDiagram = params.markdownDiagram;
      console.log(markdownDiagram);
      let result: any = {};
      try {
        // Call the renderDiagram function and log the result
        let png = await renderDiagram(markdownDiagram);
        let name = `${Date.now()}.png`;
        await supabase.storage.from("diagrams").upload(name, png);
        let { data } = supabase.storage.from("diagrams").getPublicUrl(name);
        console.log(data);
        result = {
          image: data.publicUrl,
          display: "Display by inserting the image url in your message.",
        };
        return result;
      } catch (error) {
        console.log(error);
        result = { error: error };
        return result;
      }
    },
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

export default pluginList;
