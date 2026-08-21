import { Effect } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import {
  calledAll,
  calledAny,
  lastToolCallIn,
  toolCallsIn,
} from "../domain/journal";
import type {
  CommandResult,
  Evidence,
  Score,
  ScoreResult,
  Scorer,
} from "./define";

/**
 * A scorer over the trajectory alone.
 *
 * Most scorers never touch the sandbox, so most never need to see an Effect:
 * the journal is already in hand and the judgement is a calculation.
 */
export const fromEvents =
  (judge: (events: readonly HarnessEvent[]) => ScoreResult): Scorer =>
  (evidence: Evidence) =>
    Effect.succeed(judge(evidence.events));

/**
 * A scorer over one command's result.
 *
 * The command may fail because the sandbox is gone, and that failure travels
 * rather than being folded into an exit code. A judgement that cannot tell an
 * outage from a wrong answer is the failure this system exists to prevent.
 */
export const fromShell =
  (command: string, judge: (result: CommandResult) => ScoreResult): Scorer =>
  (evidence: Evidence) =>
    evidence.exec(command).pipe(Effect.map(judge));

/**
 * The verdict a shell command gives.
 *
 * The oldest and most reliable scorer there is, and the one no eval platform
 * built around a model call can express. PostHog wrote their own because
 * Braintrust has no concept of an exit code.
 */
export const exitCodeZero = (command: string, name?: string): Scorer =>
  fromShell(command, (result) => ({
    evidence: `exit ${result.exitCode}`,
    /* Named, because a report listing six failures all called "exit code
       zero" tells nobody which rule broke. */
    name: name ?? `shell: ${command}`,
    score: result.exitCode === 0 ? 1 : 0,
  }));

/** A file exists where it was supposed to land. */
export const fileExists = (path: string): Scorer =>
  fromShell(`test -f ${JSON.stringify(path)}`, (result) => ({
    evidence: result.exitCode === 0 ? "present" : "missing",
    name: `file ${path}`,
    score: result.exitCode === 0 ? 1 : 0,
  }));

/** A file exists and contains something. Separate from `fileExists` because
 * an empty file at the right path is the commonest false pass there is. */
export const fileContains = (path: string, needle: string): Scorer =>
  fromShell(
    `grep -q -F ${JSON.stringify(needle)} ${JSON.stringify(path)}`,
    (result) => ({
      evidence: result.exitCode === 0 ? "found" : "not found",
      name: `${path} contains ${needle}`,
      score: result.exitCode === 0 ? 1 : 0,
    })
  );

/** Every named tool was used. PostHog's RequiredToolCall, Onyx's
 * ToolAssertion with require_all, written once instead of three times. */
export const usedTools = (required: readonly string[]): Scorer =>
  fromEvents((events) => ({
    evidence: `called ${toolCallsIn(events).join(", ") || "nothing"}`,
    name: `used ${required.join(", ")}`,
    score: calledAll(events, required) ? 1 : 0,
  }));

/** None of the named tools was used, and the failure names the offender:
 * a scorer that only says "forbidden tool used" leaves somebody grepping a
 * journal to find out which. PostHog's NoToolCall, DeerFlow's
 * forbidden_tool_actions. */
export const avoidedTools = (forbidden: readonly string[]): Scorer =>
  fromEvents((events) => {
    const offenders = calledAny(events, forbidden);

    return {
      evidence:
        offenders.length === 0 ? "none used" : `used ${offenders.join(", ")}`,
      name: `avoided ${forbidden.join(", ")}`,
      score: offenders.length === 0 ? 1 : 0,
    };
  });

/** What the agent finished on, which is how a customer asks whether it ended
 * by reporting rather than by still working. PostHog's LastToolCallNot. */
export const finishedWith = (name: string): Scorer =>
  fromEvents((events) => {
    const last = lastToolCallIn(events);

    return {
      evidence: last === null ? "no tool calls" : `finished on ${last}`,
      name: `finished with ${name}`,
      score: last === name ? 1 : 0,
    };
  });

/**
 * The agent did not thrash.
 *
 * A rising command count at an unchanged pass rate is the earliest visible
 * sign of a regression, and it is invisible to anything that reports only
 * whether the task was completed.
 */
export const withinCommands = (limit: number): Scorer =>
  fromEvents((events) => {
    const used = events.filter((event) => event._tag === "Command").length;

    return {
      evidence: `${used} of ${limit}`,
      name: `within ${limit} commands`,
      score: used <= limit ? 1 : 0,
    };
  });

/**
 * Everything a trajectory says, from one walk over it.
 *
 * Reported rather than gated: these are facts about how the agent worked, and
 * turning them into a pass or a failure is the caller's decision.
 */
export const trajectory = (): Scorer =>
  fromEvents((events): readonly Score[] => {
    const commands = events.filter((event) => event._tag === "Command");

    const failed = commands.filter(
      (event) =>
        event._tag === "Command" &&
        event.exitCode !== null &&
        event.exitCode !== 0
    );

    return [
      {
        evidence: `${commands.length} commands`,
        name: "commands",
        score: null,
      },
      {
        /* The number that showed the agent stumbling and recovering on every
           one of three trials, which no pass rate reports. */
        evidence: `${failed.length} of ${commands.length} failed`,
        name: "failed commands",
        score: null,
      },
      {
        evidence: toolCallsIn(events).join(", ") || "none",
        name: "tools",
        score: null,
      },
    ];
  });
