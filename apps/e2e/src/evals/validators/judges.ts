import { judge } from "anpord/validators";
import { item } from "../fixtures/catalog";

export const correctItem = judge({
  name: "correct-item",
  harness: "codex",
  model: "gpt-5.6-sol",
  prompt:
    "The final answer must report the expected item name without inventing a different item.",
  expected: item.name,
  choices: { correct: 1, incorrect: 0 },
});
