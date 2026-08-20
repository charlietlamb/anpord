import { distributionOf } from "./src/domain/distribution";
import { outcomeOf } from "./src/domain/trial";

/* What an ungated case actually produces: verify is "true", which exits 0
   with no output. */
const trials = [0, 1, 2].map(() =>
  outcomeOf({
    commandCount: 0,
    exitCode: 0,
    fingerprint: { verify: "exited 0" },
    modelMs: 100,
    sandboxMs: 50,
  })
);

console.log("per-trial status:", trials.map((t) => t.status).join(", "));
console.log("distribution:", JSON.stringify(distributionOf(trials)));
