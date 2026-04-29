const major = Number(process.versions.node.split(".")[0]);

if (!Number.isFinite(major) || major < 18) {
  console.error("");
  console.error("This project requires Node.js 18 or newer.");
  console.error(`Current version: ${process.version}`);
  console.error("");
  console.error("Your machine already has Node 20 in nvm.");
  console.error("Run:");
  console.error("  source ~/.nvm/nvm.sh");
  console.error("  nvm use 20");
  console.error("  npm start");
  console.error("");
  process.exit(1);
}
