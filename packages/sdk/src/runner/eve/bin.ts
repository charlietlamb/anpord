#!/usr/bin/env node
import { runEveTrial } from "./trial";

runEveTrial(process.argv[2]).then((code) => process.exit(code));
