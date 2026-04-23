const majorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

if (majorVersion >= 22) {
  process.exit(0);
}

console.error(
  [
    "Volley Studio requires Node 22 or later.",
    `You are currently on Node ${process.versions.node}.`,
    "Please upgrade and try again.",
  ].join(" "),
);

process.exit(1);
