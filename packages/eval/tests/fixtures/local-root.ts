import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ANPORD_LOCAL_ROOT ??= join(tmpdir(), "anpord-tests-local");
