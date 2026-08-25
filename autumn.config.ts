import { feature, item, plan } from "atmn";

/* Counted per trial: one sandbox and one agent run, which is what a run
   actually costs. A run is any number of them. */
export const evals = feature({
  consumable: true,
  id: "evals",
  name: "Evals",
  type: "metered",
});

export const free = plan({
  autoEnable: true,
  id: "free",
  items: [
    item({
      featureId: evals.id,
      included: 1000,
      reset: { interval: "month" },
    }),
  ],
  name: "Free",
});
