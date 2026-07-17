import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

const EAS_PROJECT_ID = "0ad18d34-5681-4e1c-a208-e45064b0515c";

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID ?? EAS_PROJECT_ID;
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
