import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANTHROPIC_MODEL,
  resolveAnthropicModel,
} from "../../app/api/agent/route";

describe("agent model fallback regression coverage", () => {
  it("falls back when ANTHROPIC_MODEL is empty", () => {
    expect(resolveAnthropicModel(undefined)).toBe(DEFAULT_ANTHROPIC_MODEL);
    expect(resolveAnthropicModel("")).toBe(DEFAULT_ANTHROPIC_MODEL);
    expect(resolveAnthropicModel("   ")).toBe(DEFAULT_ANTHROPIC_MODEL);
  });

  it("falls back when ANTHROPIC_MODEL is invalid", () => {
    expect(resolveAnthropicModel("gpt-4.1")).toBe(DEFAULT_ANTHROPIC_MODEL);
    expect(resolveAnthropicModel("gemini-2.0-flash")).toBe(
      DEFAULT_ANTHROPIC_MODEL
    );
  });

  it("accepts valid claude model names", () => {
    expect(resolveAnthropicModel("claude-sonnet-4-6")).toBe(
      "claude-sonnet-4-6"
    );
    expect(resolveAnthropicModel("  claude-3-5-haiku-latest  ")).toBe(
      "claude-3-5-haiku-latest"
    );
  });
});
