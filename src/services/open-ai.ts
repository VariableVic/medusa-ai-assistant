import OpenAI from "openai";
import { APIPromise } from "openai/core";
import { ChatCompletionChunk } from "openai/resources/chat";
import { Stream } from "openai/streaming";
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";
import { encoding_for_model, Tiktoken, TiktokenModel } from "@dqbd/tiktoken";

export default class OpenAiService {
  private openai: OpenAI;
  private model: TiktokenModel;
  private encoding: Tiktoken;

  constructor({}, options) {
    this.openai = new OpenAI({
      apiKey: options.api_key,
    });
    this.model = options.model || "gpt-3.5-turbo-0613";
    this.encoding = encoding_for_model("gpt-3.5-turbo");
  }

  // Create a streaming chat completion given the messages and functions
  async create({
    messages,
    functions,
  }: ChatCompletionCreateParamsBase): Promise<
    APIPromise<Stream<ChatCompletionChunk>>
  > {
    let tokens = this.count_tokens(messages, functions);
    console.log("tokens before slicing: ", tokens);

    // If the number of tokens is too high, remove the first message until it's below the token limit
    while (tokens > 3300 && messages.length > 2) {
      messages.splice(1, 1);
      tokens = this.count_tokens(messages, functions);
      console.log("tokens after slicing: ", tokens);
    }

    return await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      stream: true,
      messages,
      functions,
      function_call: "auto",
    });
  }

  // Count the number of tokens in the messages and functions
  private count_tokens(messages: any[], functions?: any[]) {
    let numTokens = 0;

    try {
      if (messages) {
        for (const message of messages) {
          if (!message) continue;
          numTokens += 4;
          for (const [key, value] of Object.entries(message)) {
            numTokens += this.encoding.encode(String(value)).length;
            if (key === "name") {
              numTokens -= 1;
            }
          }
        }
      }

      if (functions) {
        for (const func of functions) {
          if (!func) continue;
          numTokens += 2;
          for (const [key, value] of Object.entries(func)) {
            numTokens += this.encoding.encode(String(value)).length;
            if (key === "name") {
              numTokens -= 1;
            }
          }
        }
      }

      numTokens += 2;

      return numTokens;
    } catch (e) {
      console.log(e);
    }
  }
}
