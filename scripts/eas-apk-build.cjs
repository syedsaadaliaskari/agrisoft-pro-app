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
    /* .env optional */
  }
  eas.build.preview.env = {
    EXPO_PUBLIC_SUPABASE_URL:
      envFile.EXPO_PUBLIC_SUPABASE_URL || "https://vbyqlfxcfxijmrvilupp.supabase.co",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    EXPO_PUBLIC_TENANT_ID: envFile.EXPO_PUBLIC_TENANT_ID || "tenant-dev-001",
  };
  fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n");
  const r = spawnSync(
    "npx",
    ["eas-cli", "build", "-p", "android", "--profile", "preview", "--non-interactive", "--no-wait"],
    { stdio: "inherit", shell: true },
  );
  process.exitCode = r.status ?? 1;
} finally {
  fs.writeFileSync(easPath, original);
}
