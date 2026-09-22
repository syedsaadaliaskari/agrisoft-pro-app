const fs = require("fs");
const { spawnSync } = require("child_process");

const easPath = "eas.json";
const original = fs.readFileSync(easPath, "utf8");

try {
  const eas = JSON.parse(original);
  const envFile = {};
  try {
    for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      envFile[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch {
    /* .env optional if an EAS secret already exists */
  }

  const anon = envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!anon) {
    console.error(
      "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Put it in .env for this helper, or run:\n  npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --scope project\nthen:\n  npx eas-cli build -p android --profile preview",
    );
    process.exitCode = 1;
    return;
  }

  // Shop id comes from sign-in + shop code. Do not bake tenant-dev-001 into the APK.
  eas.build.preview.env = {
    EXPO_PUBLIC_SUPABASE_URL:
      envFile.EXPO_PUBLIC_SUPABASE_URL || "https://vbyqlfxcfxijmrvilupp.supabase.co",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: anon,
  };
  fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n");
  const easCmd = fs.existsSync("node_modules\\.bin\\eas.cmd")
    ? "node_modules\\.bin\\eas.cmd"
    : fs.existsSync("node_modules/.bin/eas")
      ? "node_modules/.bin/eas"
      : "npx";
  const easArgs =
    easCmd === "npx"
      ? ["--yes", "eas-cli@24.7.0", "build", "-p", "android", "--profile", "preview", "--non-interactive", "--no-wait"]
      : ["build", "-p", "android", "--profile", "preview", "--non-interactive", "--no-wait"];
  const r = spawnSync(easCmd, easArgs, { stdio: "inherit", shell: true });
  process.exitCode = r.status ?? 1;
} finally {
  fs.writeFileSync(easPath, original);
}
