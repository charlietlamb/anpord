import { describe, expect, it } from "bun:test";
import {
  decodeClaudeLine,
  decodeQwenLine,
} from "../../../src/adapters/harness/claude-events";
import { decodeGeminiLine } from "../../../src/adapters/harness/gemini-events";
import { decodeOpencodeLine } from "../../../src/adapters/harness/opencode-events";
import { decodePiLine } from "../../../src/adapters/harness/pi-events";
import { costOf } from "../../../src/domain/model-price";

const CLAUDE_ASSISTANT =
  '{"type":"assistant","message":{"model":"claude-haiku-4-5-20251001","id":"msg_011CfSo5hUGxGceA8iR2UpKw","type":"message","role":"assistant","content":[{"type":"text","text":"ok"}],"container":null,"stop_reason":null,"stop_sequence":null,"stop_details":null,"usage":{"input_tokens":10,"cache_creation_input_tokens":7883,"cache_read_input_tokens":13689,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":7883},"output_tokens":6,"service_tier":"standard","inference_geo":"not_available"},"input_transformations":[],"diagnostics":null,"context_management":null},"parent_tool_use_id":null,"session_id":"8e75a6ba-8a6d-4694-9135-47ee9c0864dd","uuid":"146b6163-0dd9-4c6d-9e2a-f0560834cb0e","timestamp":"2026-09-26T21:54:35.604Z","request_id":"req_011CfSo5h7h9rwUQyaA7nPF8"}';
const CLAUDE_RESULT =
  '{"duration_api_ms":1760,"stop_reason":"end_turn","session_id":"8e75a6ba-8a6d-4694-9135-47ee9c0864dd","total_cost_usd":0.017349899999999998,"usage":{"input_tokens":10,"cache_creation_input_tokens":7883,"cache_read_input_tokens":13689,"output_tokens":41,"output_tokens_details":{"thinking_tokens":34},"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":7883,"ephemeral_5m_input_tokens":0},"inference_geo":"not_available","iterations":[{"input_tokens":10,"output_tokens":41,"cache_read_input_tokens":13689,"cache_creation_input_tokens":7883,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":7883},"type":"message"}],"speed":"standard"},"modelUsage":{"claude-haiku-4-5-20251001":{"inputTokens":10,"outputTokens":41,"cacheReadInputTokens":13689,"cacheCreationInputTokens":7883,"webSearchRequests":0,"costUSD":0.017349899999999998,"contextWindow":200000,"maxOutputTokens":32000,"thinkingTokens":34,"canonicalModel":"claude-haiku-4-5","provider":"firstParty","costBasis":"list"}},"permission_denials":[],"terminal_reason":"completed","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","subagent_stats":{"spawned":0,"requested":{"background":0,"foreground":0,"unset":0},"started_in_background":0,"max_depth":0,"spawned_by_subagents":0,"completed":0,"failed":0,"killed":{"parent":0,"user":0,"system":0},"refused":{"depth_limit":0,"concurrency_limit":0,"budget":0},"by_type":{}},"is_error":false,"num_turns":1,"subtype":"success","api_error_status":null,"result":"ok","ttft_ms":1796,"type":"result","duration_ms":1813,"uuid":"c4f154e0-94cf-40b2-8308-71bceb1149da","ttft_stream_ms":1445,"time_to_request_ms":53,"first_content_frame_ms":1445,"queued_turn_count":0,"result_index":0}';

describe("claude, recorded from claude 2.1.283", () => {
  it("counts spend only from the result, since each assistant line repeats a partial total", () => {
    expect([
      decodeClaudeLine(CLAUDE_ASSISTANT, 0).usage,
      decodeClaudeLine(CLAUDE_RESULT, 0).usage,
    ]).toEqual([
      undefined,
      {
        cacheReadTokens: 13_689,
        cacheWrite1hTokens: 7883,
        cacheWriteTokens: 7883,
        inputTokens: 10,
        outputTokens: 41,
        totalTokens: 21_623,
      },
    ]);
  });
});

describe("claude pricing, against the recorded run", () => {
  it("prices the hour-long cache writes to the cent claude itself reported", () => {
    const usage = decodeClaudeLine(CLAUDE_RESULT, 0).usage;

    expect(
      usage &&
        costOf(usage, { cacheRead: 0.1, cacheWrite: 1.25, input: 1, output: 5 })
    ).toBeCloseTo(0.017_349_9, 12);
  });
});

describe("qwen, shaped as qwen-code builds its result usage", () => {
  const RESULT = JSON.stringify({
    is_error: false,
    result: "ok",
    session_id: "qwen-s",
    subtype: "success",
    type: "result",
    usage: {
      cache_read_input_tokens: 9000,
      input_tokens: 12_000,
      output_tokens: 300,
      total_tokens: 12_500,
    },
  });

  it("takes cached input out of the prompt and counts thinking as output", () => {
    expect(decodeQwenLine(RESULT, 0).usage).toEqual({
      cacheReadTokens: 9000,
      cacheWriteTokens: 0,
      inputTokens: 3000,
      outputTokens: 500,
      totalTokens: 12_500,
    });
  });
});

describe("gemini, shaped as gemini-cli builds its stream stats", () => {
  const RESULT = JSON.stringify({
    stats: {
      cached: 9000,
      duration_ms: 1200,
      input: 3000,
      input_tokens: 12_000,
      models: {},
      output_tokens: 300,
      tool_calls: 1,
      total_tokens: 12_500,
    },
    status: "success",
    type: "result",
  });

  it("prices cached input at the cache rate and thoughts at the output rate", () => {
    const usage = decodeGeminiLine(RESULT, 0).usage;

    expect([
      usage,
      usage &&
        costOf(usage, {
          cacheRead: 0.3,
          cacheWrite: null,
          input: 1.25,
          output: 10,
        }),
    ]).toEqual([
      {
        cacheReadTokens: 9000,
        cacheWriteTokens: 0,
        inputTokens: 3000,
        outputTokens: 500,
        totalTokens: 12_500,
      },
      0.011_45,
    ]);
  });
});

describe("opencode, shaped as its step-finish part", () => {
  const STEP = JSON.stringify({
    part: {
      cost: 0.01,
      reason: "stop",
      tokens: {
        cache: { read: 9000, write: 100 },
        input: 1200,
        output: 300,
        reasoning: 200,
        total: 10_800,
      },
      type: "step-finish",
    },
    sessionID: "ses_1",
    type: "step_finish",
  });

  it("counts reasoning, which opencode reports apart from output", () => {
    expect(decodeOpencodeLine(STEP, 0).usage).toEqual({
      cacheReadTokens: 9000,
      cacheWriteTokens: 100,
      inputTokens: 1200,
      outputTokens: 500,
      totalTokens: 10_800,
    });
  });
});

describe("pi, shaped as pi-ai usage on message_end", () => {
  const END = JSON.stringify({
    message: {
      content: [{ text: "ok", type: "text" }],
      role: "assistant",
      usage: {
        cacheRead: 9000,
        cacheWrite: 100,
        cacheWrite1h: 60,
        cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
        input: 1200,
        output: 300,
        totalTokens: 10_600,
      },
    },
    type: "message_end",
  });

  it("keeps cache reads and writes pi reports beside fresh input", () => {
    expect(decodePiLine(END, 0).usage).toEqual({
      cacheReadTokens: 9000,
      cacheWrite1hTokens: 60,
      cacheWriteTokens: 100,
      inputTokens: 1200,
      outputTokens: 300,
      totalTokens: 10_600,
    });
  });
});
