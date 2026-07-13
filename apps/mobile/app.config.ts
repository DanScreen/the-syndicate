import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID;

  return {
    ...config,
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...config.extra,
      eas: {
        projectId,
      },
    },
  };
};
