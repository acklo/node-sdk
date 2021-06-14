// Disable chalk's terminal output coloring while running
// tests. This is required because Chalk detects some CI
// environments (like GitHub Actions) as not supporting
// ANSI terminal colours. This means that any snapshot assertions
// created locally (where ANSI terminal colours are supported) will
// look different to those created on CI runs.
process.env["FORCE_COLOR"] = "0";
