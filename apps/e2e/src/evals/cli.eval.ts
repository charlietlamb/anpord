import { empty, suite } from "anpord";
import { tasks, trials } from "./config";
import { catalogCli } from "./mocks/catalog-cli";
import { validateCli } from "./validators/catalog";
import { correctItem } from "./validators/judges";

export default suite({
  name: "anpord-ci/cli",
  source: empty,
  cli: [catalogCli],
  prompt:
    "Use the installed catalog CLI. Discover its commands with --help. First try to get item missing. If it does not exist, list the items and retrieve ci_fixture. Report its name. Do not install tools or contact external APIs.",
  cases: [{ name: "retrieve-item", validate: [validateCli, correctItem] }],
  tasks,
  trials,
});
