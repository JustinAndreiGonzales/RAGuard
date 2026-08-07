import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const model = "claude-haiku-4-5";
