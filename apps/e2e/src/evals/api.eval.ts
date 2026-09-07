import { empty, suite } from "anpord";
import { tasks, trials } from "./config";
import { catalogApi } from "./mocks/catalog-api";
import { validateApi } from "./validators/api";
import { correctItem } from "./validators/judges";

export default suite({
  name: "anpord-ci/api",
  source: empty,
  api: [catalogApi],
  prompt:
    "Use the local catalog HTTP API. First request item missing. If it does not exist, list the items and retrieve ci_fixture. Report its name. Do not install tools or contact external APIs.",
  cases: [{ name: "retrieve-item", validate: [validateApi, correctItem] }],
  tasks,
  trials,
});
