const majorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

if (majorVersion === 22) {
  process.exit(0);
}

console.error(
  [
    "Volley Studio needs Node 22 to run cleanly.",
    `You are currently on Node ${process.versions.node}.`,
    "Switch to 22.22.0 from .nvmrc, then run the command again.",
  ].join(" "),
);

process.exit(1);
