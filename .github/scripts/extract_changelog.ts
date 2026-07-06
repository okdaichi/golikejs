// Extracts the changelog body for a given version from CHANGELOG.md.
//
// Usage: deno run -A .github/scripts/extract_changelog.ts <version>
// Prints the section text: everything after the `## [<version>] ...` heading up
// to (but not including) the next `## [` heading. Prints nothing (exit 0) if
// the section is absent.
const version = Deno.args[0];
if (!version) {
	console.error("usage: extract_changelog.ts <version>");
	Deno.exit(2);
}
const md = await Deno.readTextFile("CHANGELOG.md");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(
	`##\\s*\\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s*\\[|$)`,
);
const m = md.match(re);
console.log((m?.[1] ?? "").trim());
