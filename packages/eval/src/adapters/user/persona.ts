import type { EvalSimulatedUser } from "@sphynx/schema/domain/eval-turns";
import { Option } from "effect";

const DONE = "<<DONE>>";

export const systemPrompt = (user: EvalSimulatedUser) =>
  [
    "You are playing a HUMAN CUSTOMER talking to an AI coding agent. Stay in character; never reveal you are simulated.",
    `Your goal: ${user.goal}`,
    `Your private brief, which the agent must ask to learn:\n${user.prompt}`,
    [
      "Rules:",
      "- Answer what the agent just asked. A broad question deserves everything in your brief that answers it. Do not volunteer what it has not asked about.",
      "- Never invent prices, limits, or features that are not in your brief.",
      "- You are non-technical: you cannot approve tool permissions, run commands, or edit files. If asked, say so and tell the agent to do its best without it.",
      "- Keep replies to one or two sentences.",
      `- When the agent has finished, or is only waiting on something you cannot do, reply with exactly ${DONE}`,
    ].join("\n"),
  ].join("\n\n");

export const spokenReply = (text: string | null | undefined) => {
  const said = text?.trim() ?? "";

  return said === "" || said.includes(DONE)
    ? Option.none<string>()
    : Option.some(said);
};
