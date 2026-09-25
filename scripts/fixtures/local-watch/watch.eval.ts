import { command, suite } from "anpord";

const profile = { dir: "./profile", name: "watch" };

export default suite({
  id: "local-watch",
  name: "local/watch",
  prompt: "Write hello.txt containing hello.",
  cases: [
    {
      id: "writes-hello",
      name: "writes-hello",
      validate: command('test "$(cat hello.txt)" = hello'),
    },
  ],
  variants: [
    { harness: "command", model: "probe-a", profile, sandbox: "local" },
    { harness: "command", model: "probe-b", profile, sandbox: "local" },
  ],
  trials: 1,
});
