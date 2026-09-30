import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const checks = [
  ["apps/server/src/o1/permissions.ts", /ask_codex|Ask Codex/, "legacy Codex permission naming"],
  ["apps/mobile/src/permission-mode-picker.tsx", /ask_codex|Ask Codex|full_access/, "legacy permission values in public UI"],
  ["packages/domain/src/plans.ts", /name: "Mini"|name: "Agent Pro\+"/, "missing commercial plan catalog"],
  ["apps/server/src/o1/model-router.ts", /Unknown O1 plan/, "runtime plan validation"],
  ["apps/server/src/o1/mission-governor.ts", /unknown_outcome/, "uncertain outcome state"],
];

let failures = 0;
for (const [file, pattern, label] of checks) {
  if (!existsSync(file)) { console.error(`O1 audit: missing ${file}`); failures += 1; continue; }
  const content = await readFile(file, "utf8");
  if (file.includes("permissions.ts") && pattern.test(content)) { console.error(`O1 audit: ${label}`); failures += 1; }
  else if (file.includes("permission-mode-picker.tsx") && pattern.test(content)) { console.error(`O1 audit: ${label}`); failures += 1; }
  else if (file.endsWith("plans.ts") && !pattern.test(content)) { console.error(`O1 audit: ${label}`); failures += 1; }
  else if (file.endsWith("model-router.ts") && !pattern.test(content)) { console.error(`O1 audit: ${label}`); failures += 1; }
  else if (file.endsWith("mission-governor.ts") && !pattern.test(content)) { console.error(`O1 audit: ${label}`); failures += 1; }
}
if (failures) process.exit(1);
console.log("O1 static audit passed");