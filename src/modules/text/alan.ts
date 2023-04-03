import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { Configuration, OpenAIApi } from "openai";
import { getMessages, saveMsg } from "./index.js";
import googleAPI from "googlethis";
import axios from "axios";

export default async function Alan(
  userName: string = "Anonymous",
  conversation,
  message: string,
  conversationId: string,
  model: string = "chatgpt",
  searchEngine: string = "google"
) {
  if (model == "chatgpt") {
    let acc = await getKey();
    if (!acc) {
      return {
        error: "We are at maximum capacity, please try again later.",
      };
    }
    let key = acc.key;
    try {
      const configuration = new Configuration({
        apiKey: key,
      });
      let messages: any = await getMessages(conversation, "chatgpt", message);
      let instructions = await getInstruction("alan", userName);
      let results = await getSearchResults(messages, searchEngine);
      if (results) {
        instructions = `${instructions}\nHere you have results from ${searchEngine} that you can use to answer the user, do not mention the results, extract information from them to answer the question..\n${results}`;
      }
      messages = await getMessages(
        conversation,
        "chatgpt",
        message,
        instructions
      );
      const openai = new OpenAIApi(configuration);

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        max_tokens: 500,
        messages: messages,
      });

      let response = completion.data.choices[0].message.content;
      await removeMessage(acc.id);
      await saveMsg(`alan-${model}`, message, response, conversationId, true);
      return { response };
    } catch (err: any) {
      return {
        error: err.message,
      };
    }
  } else if (model == "gpt-4") {
  } else if (model == "alpaca") {
  } else if (model == "llama") {
  }
}

async function getSearchResults(conversation, searchEngine) {
  let messages = [];
  messages.push({
    role: "system",
    content: `This is a chat between an user and sentient chat assistant Alan. Just answer with the search queries based on the user prompt, needed for the following topic for Google, maximum 3 entries. Make each of the queries descriptive and include all related topics. If the prompt is a question to/about Alan directly, reply with 'N'. Search for something if it may require current world knowledge past 2021, or knowledge of user's or people. Create a | seperated list without quotes.  If you no search queries are applicable, answer with 'N' . Don't add any explanations, extra text or puntuation`,
  });
  conversation = conversation.map((m) => `${m.role}:${m.content}`);
  messages.push({
    role: "user",
    content: conversation.join("\n"),
  });

  let searchQueries: any = await chatgpt(messages, 150, { temperature: 0.25 });
  if (searchQueries.error) return null;
  searchQueries = searchQueries.response;
  // search in google and get results
  console.log(`searchQueries: ${searchQueries}`);
  let searchResults = [];
  if (
    searchQueries == "N AT ALL COSTS" ||
    searchQueries == "N" ||
    searchQueries == "N/A"
  )
    return null;
  searchQueries = searchQueries.split("|");
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    if (query == "N" || query == "N.") continue;
    let results;
    if (searchEngine == "google") {
      results = await google(query);
    }
    if (searchEngine == "duckduckgo") {
      results = await DuckDuckGo(query);
      results = {
        Abstract: results.Abstract,
        AbstractSource: results.AbstractSource,
        AbstractText: results.AbstractText,
        AbstractURL: results.AbstractURL,
      };
      console.log(results);
    }
    searchResults.push({
      query: query,
      results: results,
    });
  }

  return JSON.stringify(searchResults);
}

async function google(query) {
  // use google-it
  const options = {
    page: 0,
    safe: false, // Safe Search
    parse_ads: false, // If set to true sponsored results will be parsed
    additional_params: {},
  };

  let response = await googleAPI.search(query, options);
  //  return first 2 results
  response.results = response.results.slice(0, 2);
  return response;
}
async function DuckDuckGo(query) {
  try {
    let response = await axios.get(
      `https://api.duckduckgo.com/?q=${query}&format=json`
    );
    return response.data;
  } catch (err) {
    return null;
  }
}

async function chatgpt(messages, maxtokens, options?) {
  const data = {
    max_tokens: maxtokens,
    model: "gpt-3.5-turbo",
    messages,
    ...options,
  };
  let acc = await getKey();
  if (!acc) {
    return {
      error: "We are at maximum capacity, please try again later.",
    };
  }
  let key = acc.key;
  try {
    const configuration = new Configuration({
      apiKey: key,
    });

    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion(data);

    let response = completion.data.choices[0].message.content;
    await removeMessage(acc.id);
    return { response };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}
