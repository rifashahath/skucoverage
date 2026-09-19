#!/usr/bin/env npx tsx
/**
 * Run the engine against a JSON request file (or stdin) and print ONLY JSON.
 *   npx tsx cli.ts test/fixtures.json
 *   cat request.json | npx tsx cli.ts
 */
import { readFileSync } from "node:fs"
import { runEngine } from "./src/engine"

const file = process.argv[2]
const raw = readFileSync(file ?? 0, "utf8")
process.stdout.write(JSON.stringify(runEngine(JSON.parse(raw)), null, 2) + "\n")
