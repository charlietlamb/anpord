export interface ModelProvider {
  readonly baseUrl: string;
  readonly id: string;
  readonly label: string;
}

/* One row per provider that speaks the OpenAI chat-completions shape, which is
   every one of these. A provider is added by its base url rather than by a
   client of its own, so nothing here needs code to support the next one. */
export const MODEL_PROVIDERS: readonly ModelProvider[] = [
  {
    baseUrl: "https://api.openai.com/v1",
    id: "openai",
    label: "OpenAI",
  },
  {
    baseUrl: "https://api.anthropic.com/v1",
    id: "anthropic",
    label: "Anthropic",
  },
  {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    id: "google",
    label: "Google",
  },
  {
    baseUrl: "https://api.x.ai/v1",
    id: "xai",
    label: "xAI",
  },
  {
    baseUrl: "https://api.moonshot.ai/v1",
    id: "moonshotai",
    label: "Moonshot",
  },
  {
    baseUrl: "https://api.deepseek.com/v1",
    id: "deepseek",
    label: "DeepSeek",
  },
  {
    baseUrl: "https://api.groq.com/openai/v1",
    id: "groq",
    label: "Groq",
  },
  {
    baseUrl: "https://openrouter.ai/api/v1",
    id: "openrouter",
    label: "OpenRouter",
  },
];
