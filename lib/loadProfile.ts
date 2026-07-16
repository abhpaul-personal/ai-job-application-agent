// Server-only: reads from disk via node:fs. Never import this from a "use client" component.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProfileSchema, type Profile } from "./schema";

function readProfileJson(filePath: string): Profile {
  const raw = fs.readFileSync(filePath, "utf-8");
  return ProfileSchema.parse(JSON.parse(raw));
}

export function loadProfileFromDir(dir: string): Profile {
  const localPath = path.join(dir, "profile.local.json");
  if (fs.existsSync(localPath)) {
    return readProfileJson(localPath);
  }
  return readProfileJson(path.join(dir, "default-profile.example.json"));
}

function loadDefaultProfileSafely(dir: string): Profile {
  const localPath = path.join(dir, "profile.local.json");
  if (fs.existsSync(localPath)) {
    try {
      return readProfileJson(localPath);
    } catch (err) {
      // Never log err.message/err.issues[].message here: for a ZodError those
      // can echo back the actual invalid value from the user's real personal
      // file. Only path+code are safe to print.
      const detail =
        err instanceof z.ZodError
          ? err.issues.map((issue) => `${issue.path.join(".")} (${issue.code})`).join(", ")
          : "unreadable or invalid JSON";
      console.warn(
        `config/profile.local.json does not match ProfileSchema (${detail}); falling back to config/default-profile.example.json.`,
      );
    }
  }
  return readProfileJson(path.join(dir, "default-profile.example.json"));
}

// Uses a warn-and-fall-back strategy (rather than loadProfileFromDir's throw)
// so that an out-of-date local override never breaks the build/test run for
// unrelated code that happens to import this module.
export const defaultProfile = loadDefaultProfileSafely(
  path.join(process.cwd(), "config"),
);
