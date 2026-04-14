import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import app from "./app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Launch Discord bot as a child process so it runs alongside the API server.
// This means UptimeRobot pinging /api/alive keeps both the API and the bot alive.
function startBot() {
  // dist/ -> api-server/ -> artifacts/ -> workspace root -> bot/
  const botPath = path.resolve(__dirname, "../../../bot/index.js");
  // Remove PORT from env so bot's HTTP server uses its own port (3000) not the API's port
  const { PORT: _ignored, ...botEnv } = process.env;
  const bot = spawn("node", [botPath], {
    stdio: "inherit",
    env: botEnv,
  });

  bot.on("error", (err) => {
    logger.error({ err }, "Discord bot process error");
  });

  bot.on("exit", (code) => {
    logger.warn({ code }, "Discord bot exited — restarting in 5s");
    setTimeout(startBot, 5000);
  });

  logger.info("Discord bot started");
}

startBot();
