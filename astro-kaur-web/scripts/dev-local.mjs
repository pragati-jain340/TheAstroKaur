import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const web = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
  stdio: "inherit", windowsHide: true,
});
const bookings = spawn(process.execPath, [fileURLToPath(new URL("./booking-local.mjs", import.meta.url))], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, BOOKING_DEV_PARENT_PID: String(web.pid) },
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [bookings, web]) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32") {
      try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); } catch { /* Already stopped. */ }
    } else child.kill("SIGTERM");
  }
  process.exit(code);
}
web.on("exit", code => stop(code || 0));
web.on("error", () => { console.error("Unable to start the development website."); stop(1); });
bookings.on("exit", code => {
  if (code && !stopping) console.error("Booking services stopped. See the error above; checkout stays paused until they reconnect.");
});
bookings.on("error", () => console.error("Unable to start booking services. Run npm run booking:local to retry."));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
