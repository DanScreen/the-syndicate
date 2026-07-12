const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// npm workspaces can install duplicate React copies — Metro must use one instance.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

module.exports = config;
