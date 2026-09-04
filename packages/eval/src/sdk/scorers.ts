import { Effect } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import {
  answerOf,
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

/** For a judgement over the journal alone, which is most of them. */
export const fromEvents =
  (judge: (events: readonly HarnessEvent[]) => ScoreResult): Scorer =>
  (evidence: Evidence) =>
    Effect.succeed(judge(evidence.events));

/** For a judgement over one command. A sandbox failure travels rather than
 * being folded into an exit code, so an outage never reads as a wrong answer. */
export const fromShell =
  (command: string, judge: (result: CommandResult) => ScoreResult): Scorer =>
  (evidence: Evidence) =>
    evidence.exec(command).pipe(Effect.map(judge));

export const exitCodeZero = (command: string, name?: string): Scorer =>
  fromShell(command, (result) => ({
    evidence: `exit ${result.exitCode}`,
    name: name ?? `shell: ${command}`,
    score: result.exitCode === 0 ? 1 : 0,
  }));

export const fileExists = (path: string): Scorer =>
  fromShell(`test -f ${JSON.stringify(path)}`, (result) => ({
    evidence: result.exitCode === 0 ? "present" : "missing",
    name: `file ${path}`,
    score: result.exitCode === 0 ? 1 : 0,
  }));

/** Separate from `fileExists`: an empty file at the right path is the
 * commonest false pass there is. */
export const fileContains = (path: string, needle: string): Scorer =>
  fromShell(
    `grep -q -F ${JSON.stringify(needle)} ${JSON.stringify(path)}`,
    (result) => ({
      evidence: result.exitCode === 0 ? "found" : "not found",
      name: `${path} contains ${needle}`,
      score: result.exitCode === 0 ? 1 : 0,
    })
  );

export const usedTools = (required: readonly string[]): Scorer =>
  fromEvents((events) => ({
    evidence: `called ${toolCallsIn(events).join(", ") || "nothing"}`,
    name: `used ${required.join(", ")}`,
    score: calledAll(events, required) ? 1 : 0,
  }));

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
 * Which needles the answer contains, case-insensitively.
 *
 * Case-insensitive by decision, not by accident: a case asserting an agent
 * mentioned `useState` should not fail because it wrote `useState()` at the
 * start of a sentence, and a case that genuinely turns on case is asserting
 * over code, where a file scorer reads the file rather than the reply.
 */
const found = (events: readonly HarnessEvent[], needles: readonly string[]) => {
  const answer = answerOf(events).toLowerCase();

  return needles.filter((needle) => answer.includes(needle.toLowerCase()));
};

/** Read from the journal rather than from the sandbox, so a judgement over
 * what the agent said needs no shell and no file. */
export const answerContainsAny = (
  needles: readonly string[],
  name?: string
): Scorer =>
  fromEvents((events) => {
    const hits = found(events, needles);

    return {
      evidence: hits.length === 0 ? "none found" : `found ${hits.join(", ")}`,
      name: name ?? `answer contains any of ${needles.join(", ")}`,
      score: hits.length > 0 ? 1 : 0,
    };
  });

export const answerContainsAll = (
  needles: readonly string[],
  name?: string
): Scorer =>
  fromEvents((events) => {
    const hits = new Set(found(events, needles));
    const missing = needles.filter((needle) => !hits.has(needle));

    return {
      evidence:
        missing.length === 0 ? "all found" : `missing ${missing.join(", ")}`,
      name: name ?? `answer contains ${needles.join(", ")}`,
      score: missing.length === 0 ? 1 : 0,
    };
  });

/** Scores 1 when no needle appears, so an empty list of needles passes: an
 * assertion about nothing is not a failure. */
export const answerContainsNone = (
  needles: readonly string[],
  name?: string
): Scorer =>
  fromEvents((events) => {
    const hits = found(events, needles);

    return {
      evidence: hits.length === 0 ? "none found" : `found ${hits.join(", ")}`,
      name: name ?? `answer avoids ${needles.join(", ")}`,
      score: hits.length === 0 ? 1 : 0,
    };
  });

/** A rising command count at an unchanged pass rate is the earliest visible
 * sign of a regression. */
export const withinCommands = (limit: number): Scorer =>
  fromEvents((events) => {
    const used = events.filter((event) => event._tag === "Command").length;

    return {
      evidence: `${used} of ${limit}`,
      name: `within ${limit} commands`,
      score: used <= limit ? 1 : 0,
    };
  });

/** Reported rather than gated: turning these into a verdict is the caller's
 * decision. */
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
