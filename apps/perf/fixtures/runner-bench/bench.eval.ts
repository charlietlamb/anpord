import { command, suite } from "sphynx-sh";
import { judge } from "sphynx-sh/validators";
import { seedWorkspace } from "./prepare";
import { wroteReport } from "./validate";

const profile = { dir: "./profile", name: "bench" };

const quality = judge({
  choices: { good: 1, poor: 0 },
  model: "perf-fake-judge",
  name: "quality",
  prompt: "The agent wrote report.txt and said what it did.",
  provider: "openai",
});

export default suite({
  cases: [
    {
      id: "bench-verify",
      name: "bench-verify",
      validate: command('test "$(cat hello.txt)" = hello'),
    },
    {
      id: "bench-prepared",
      name: "bench-prepared",
      prepare: seedWorkspace,
      validate: wroteReport,
    },
    {
      id: "bench-judged",
      name: "bench-judged",
      prepare: seedWorkspace,
      validate: [wroteReport, quality],
    },
  ],
  id: "perf-runner-bench",
  name: "perf/runner-bench",
  prompt: "Read src, then write report.txt containing done.",
  trials: 3,
  variants: [
    { harness: "command", model: "steps-20", profile, sandbox: "local" },
  ],
});
