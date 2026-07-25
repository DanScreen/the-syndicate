import { existsSync } from "node:fs";
import { join } from "node:path";

import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

const EAS_PROJECT_ID = "0ad18d34-5681-4e1c-a208-e45064b0515c";

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID ?? EAS_PROJECT_ID;
  // app.json is loosely typed as JSON — cast to the Expo config shape.
  const base = appJson.expo as unknown as ExpoConfig;

  // Android push (expo-notifications) delivers via FCM, which needs
  // google-services.json at build time. Attach it only when present so the
  // Android build still succeeds before Firebase is set up. Commit the file
  // once you have it — it is client config, not a secret, and EAS only
  // uploads tracked/committed files. See ANDROID_LAUNCH.md.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_FILE ?? "./google-services.json";
  const hasGoogleServices = existsSync(join(__dirname, googleServicesFile));
  const android: ExpoConfig["android"] = hasGoogleServices
    ? { ...(base.android ?? {}), googleServicesFile }
    : base.android;

  return {
    ...config,
    ...base,
    android,
    extra: {
      ...(base.extra ?? {}),
      ...config.extra,
      eas: {
        projectId,
      },
    },
  };
};
