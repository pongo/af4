import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import type { Plugin, ResolvedConfig } from "vite";

interface Options {
  /** name of the emitted JSON file in dist/ (default: 'version.json') */
  readonly output?: string;
  /** whether to inject compile-time constants (default: true) */
  readonly define?: boolean | "minimal";
}

// run `git describe --tags --always` or fall back
export function gitTag(): string {
  try {
    return execSync("git describe --tags --always", { stdio: "pipe" }).toString().trim();
  } catch {
    return "untagged";
  }
}

// Get last git commit hash
export function gitCommitHash(): string {
  try {
    return execSync("git rev-parse HEAD", { stdio: "pipe" }).toString().trim();
  } catch {
    return "unknown";
  }
}

// Get last git commit timestamp (ISO 8601)
export function gitCommitTimestamp(): string {
  try {
    return execSync("git log -1 --format=%cI", { stdio: "pipe" }).toString().trim();
  } catch {
    return "unknown";
  }
}

// Functional Core: Data structures
interface VersionDetails {
  readonly name: string;
  readonly version: string;
  readonly tag: string;
  readonly commit: string;
  readonly commitTime: string;
  readonly created: string;
}

interface VersionDataInput {
  readonly packageJsonString: string;
  readonly gitTagValue: string;
  readonly gitCommitValue: string;
  readonly gitCommitTimestampValue: string;
  readonly timestampForJsonCreation: string;
  readonly timestampForDefaultVersion: string; // For generating version if missing from package.json
  readonly pluginOptions: Readonly<Options>;
}

interface ProcessedVersionInfo {
  readonly versionDetails: VersionDetails;
  readonly defines?: Record<string, string>;
}

// Functional Core: Pure function to generate version information
function generateVersionInfo(input: VersionDataInput): ProcessedVersionInfo {
  const pkg = JSON.parse(input.packageJsonString) as { version?: string; name?: string };
  const defaultVersionString = input.timestampForDefaultVersion.replace(/[-:T]/g, "").slice(0, 15); // YYYYMMDDHHmmss
  const version = pkg.version ?? defaultVersionString;
  const pkgName = pkg.name ?? "unknown";

  const versionDetails: VersionDetails = {
    name: pkgName,
    version,
    tag: input.gitTagValue,
    commit: input.gitCommitValue,
    commitTime: input.gitCommitTimestampValue,
    created: input.timestampForJsonCreation,
  };

  let defines: Record<string, string> | undefined;
  if (input.pluginOptions.define !== false) {
    defines = {};
    defines["import.meta.env.APP_VERSION"] = JSON.stringify(version);
    if (input.pluginOptions.define !== "minimal") {
      defines["import.meta.env.APP_TAG"] = JSON.stringify(input.gitTagValue);
    }
  }

  return { versionDetails, defines };
}

// Imperative Shell: Vite plugin
export default function versionJson(opts: Options = {}): Plugin {
  const outFile = opts.output ?? "version.json";
  // const doDefine = opts.define !== false // Retained for clarity, though logic is in generateVersionInfo
  // const minimalDefine = opts.define === 'minimal' // Retained for clarity

  let viteConfig: ResolvedConfig;
  let initialVersionDetails: VersionDetails; // To store details from configResolved

  return {
    name: "version-json", // Original name, kept as is

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
      const packageJsonPath = resolve(viteConfig.root, "package.json");
      const packageJsonString = readFileSync(packageJsonPath, "utf-8");

      const tag = gitTag();
      const commit = gitCommitHash();
      const commitTime = gitCommitTimestamp();
      const nowISO = new Date().toISOString();

      const processedInfo = generateVersionInfo({
        packageJsonString,
        gitTagValue: tag,
        gitCommitValue: commit,
        gitCommitTimestampValue: commitTime,
        timestampForJsonCreation: nowISO,
        timestampForDefaultVersion: nowISO,
        pluginOptions: opts, // Pass opts directly as it conforms to Options type
      });

      initialVersionDetails = processedInfo.versionDetails;

      if (processedInfo.defines && viteConfig.define) {
        for (const key in processedInfo.defines) {
          viteConfig.define[key] = processedInfo.defines[key];
        }
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === viteConfig.base + outFile) {
          // Use outFile for dynamic path
          // Serve with details captured at configResolved, including its 'created' time
          const payload = JSON.stringify(initialVersionDetails, null, 2);
          res.setHeader("Content-Type", "application/json");
          res.end(payload);
          return;
        }
        next();
      });
    },

    closeBundle() {
      if (viteConfig.command !== "build") return;

      // For the final build, use the details from configResolved but update 'created' timestamp
      const now = new Date().toISOString();
      const finalPayloadObject: VersionDetails = {
        ...initialVersionDetails,
        created: now,
      };
      const payload = JSON.stringify(finalPayloadObject, null, 2);

      const outPath = resolve(viteConfig.root, viteConfig.build.outDir, outFile);
      writeFileSync(outPath, payload, "utf-8");
      // Use this.info if available, otherwise console.log as a fallback
      const logger = typeof this.info === "function" ? this : console;
      logger.info(`wrote ${viteConfig.build.outDir}/${outFile}`);
    },
  };
}
