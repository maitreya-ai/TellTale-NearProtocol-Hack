import { describe, expect, it } from "@jest/globals";
import { aiConfig, aiConfigOrNull, aiLabel, MissingEnvError } from "../src";

describe("live LLM config", () => {
  it("prefers NEAR AI Cloud when its key is set", () => {
    const env = { NEAR_AI_API_KEY: "near-key", GROQ_API_KEY: "groq-key" };
    expect(aiConfigOrNull(env)).toEqual({
      provider: "NEAR AI Cloud",
      apiKey: "near-key",
      baseUrl: "https://cloud-api.near.ai/v1",
      model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
    });
  });

  it("falls back to Groq, with an overridable model", () => {
    const env = { NEAR_AI_API_KEY: " ", GROQ_API_KEY: "groq-key", GROQ_MODEL: "qwen/qwen3.8-27b" };
    expect(aiConfigOrNull(env)).toMatchObject({
      provider: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "qwen/qwen3.8-27b",
    });
    expect(aiLabel({ GROQ_API_KEY: "groq-key" })).toBe("Groq · openai/gpt-oss-120b");
  });

  it("lets LLM_PROVIDER pick Groq even when a NEAR AI key is stored", () => {
    const env = { NEAR_AI_API_KEY: "near-key", GROQ_API_KEY: "groq-key", LLM_PROVIDER: "groq" };
    expect(aiConfigOrNull(env)?.provider).toBe("Groq");
    expect(aiConfigOrNull({ ...env, LLM_PROVIDER: "near-ai" })?.provider).toBe("NEAR AI Cloud");
    expect(aiConfigOrNull({ GROQ_API_KEY: "groq-key", LLM_PROVIDER: "near-ai" })?.provider).toBe(
      "Groq",
    );
  });

  it("reports no live model without a key", () => {
    expect(aiConfigOrNull({})).toBeNull();
    expect(aiLabel({})).toBeNull();
    expect(() => aiConfig({})).toThrow(MissingEnvError);
  });
});
