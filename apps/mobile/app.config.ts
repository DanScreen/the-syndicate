import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID;
  // app.json is loosely typed as JSON — cast to the Expo config shape.
  const base = appJson.expo as unknown as ExpoConfig;

  return {
    ...config,
    ...base,
    extra: {
      ...(base.extra ?? {}),
      ...config.extra,
      eas: {
        projectId,
      },
    },
  };
};
