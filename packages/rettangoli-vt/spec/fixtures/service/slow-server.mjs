// A managed service that never becomes ready: it writes its pid and stays alive without listening.
// On SIGTERM it takes 300 ms to shut down, then writes the optional stopped marker.
// Usage: node slow-server.mjs <pid-file> [stopped-marker]
import { writeFileSync } from "node:fs";

const [pidFile, stoppedMarker] = process.argv.slice(2);
process.on("SIGTERM", () => {
  setTimeout(() => {
    if (stoppedMarker) writeFileSync(stoppedMarker, "stopped\n");
    process.exit(0);
  }, 300);
});
setInterval(() => {}, 1000);
// Written last: once the pid file exists, SIGTERM is handled.
writeFileSync(pidFile, String(process.pid));
