import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SPHYNX_LOCAL_ROOT ??= join(tmpdir(), "sphynx-tests-local");
