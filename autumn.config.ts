import { feature, item, plan } from "atmn";

/* A trial is one sandbox and one agent run, which is what a run actually
   costs us. A run is any number of them, so it is the wrong unit to count. */
export const evalTrials = feature({
  consumable: true,
  id: "eval_trials",
  name: "Eval trials",
  type: "metered",
});

export const free = plan({
  autoEnable: true,
  id: "free",
  items: [
    item({
      featureId: evalTrials.id,
      included: 1000,
      reset: { interval: "month" },
    }),
  ],
  name: "Free",
});
