import type { Prepare } from "anpord";

export const seedWorkspace: Prepare = async ({ exec }) => {
  await exec("bash", [
    "-c",
    "mkdir -p src && for i in $(seq 1 50); do echo line $i > src/f$i.txt; done",
  ]);
  return { files: 50 };
};
