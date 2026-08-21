import {
  calledAll,
  calledAny,
  lastToolCallIn,
  toolCallsIn,
} from "../domain/journal";
import type { Evidence, Score, Scorer } from "./define";

/**
 * The verdict a shell command gives.
 *
 * The oldest and most reliable scorer there is, and the one no eval platform
 * built around a model call can express. PostHog wrote their own because
 * Braintrust has no concept of an exit code.
 */
export const exitCodeZero =
  (command: string): Scorer =>
  async (evidence: Evidence): Promise<Score> => {
    const result = await evidence.exec(command);

    return {
      evidence: `exit ${result.exitCode}`,
      name: "exit code zero",
      score: result.exitCode === 0 ? 1 : 0,
    };
  };

/** A file exists where it was supposed to land. */
export const fileExists =
  (path: string): Scorer =>
  async (evidence: Evidence): Promise<Score> => {
    const result = await evidence.exec(`test -f ${JSON.stringify(path)}`);

    return {
      evidence: result.exitCode === 0 ? "present" : "missing",
      name: `file ${path}`,
      score: result.exitCode === 0 ? 1 : 0,
    };
  };

/** A file exists and contains something. Separate from `fileExists` because
 * an empty file at the right path is the commonest false pass there is. */
export const fileContains =
  (path: string, needle: string): Scorer =>
  async (evidence: Evidence): Promise<Score> => {
    const result = await evidence.exec(
      `grep -q -F ${JSON.stringify(needle)} ${JSON.stringify(path)}`
    );

    return {
      evidence: result.exitCode === 0 ? "found" : "not found",
      name: `${path} contains ${needle}`,
      score: result.exitCode === 0 ? 1 : 0,
    };
  };

/** Every named tool was used. PostHog's RequiredToolCall, Onyx's
 * ToolAssertion with require_all, written once instead of three times. */
export const usedTools =
  (required: readonly string[]): Scorer =>
  (evidence: Evidence): Score => ({
    evidence: `called ${toolCallsIn(evidence.events).join(", ") || "nothing"}`,
    name: `used ${required.join(", ")}`,
    score: calledAll(evidence.events, required) ? 1 : 0,
  });

/** None of the named tools was used, and the failure names the offender:
 * a scorer that only says "forbidden tool used" leaves somebody grepping a
 * journal to find out which. PostHog's NoToolCall, DeerFlow's
 * forbidden_tool_actions. */
export const avoidedTools =
  (forbidden: readonly string[]): Scorer =>
  (evidence: Evidence): Score => {
    const offenders = calledAny(evidence.events, forbidden);

    return {
      evidence:
        offenders.length === 0 ? "none used" : `used ${offenders.join(", ")}`,
      name: `avoided ${forbidden.join(", ")}`,
      score: offenders.length === 0 ? 1 : 0,
    };
  };

/** What the agent finished on, which is how a customer asks whether it ended
 * by reporting rather than by still working. PostHog's LastToolCallNot. */
export const finishedWith =
  (name: string): Scorer =>
  (evidence: Evidence): Score => {
    const last = lastToolCallIn(evidence.events);

    return {
      evidence: last === null ? "no tool calls" : `finished on ${last}`,
      name: `finished with ${name}`,
      score: last === name ? 1 : 0,
    };
  };

/**
 * The agent did not thrash.
 *
 * A rising command count at an unchanged pass rate is the earliest visible
 * sign of a regression, and it is invisible to anything that reports only
 * whether the task was completed.
 */
export const withinCommands =
  (limit: number): Scorer =>
  (evidence: Evidence): Score => {
    const used = evidence.events.filter(
      (event) => event._tag === "Command"
    ).length;

    return {
      evidence: `${used} of ${limit}`,
      name: `within ${limit} commands`,
      score: used <= limit ? 1 : 0,
    };
  };
