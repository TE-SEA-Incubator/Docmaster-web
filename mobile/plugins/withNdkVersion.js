const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to override the Android NDK version used by the Expo/React Native
 * build system. The expoLibs version catalog is seeded from react-native's
 * libs.versions.toml (which pins ndkVersion = "27.1.12297006"), and neither
 * expo-build-properties nor useExpoVersionCatalog propagates the ndkVersion
 * gradle property into rootProject.ext. Setting ext.ndkVersion in the root
 * build.gradle before expo-root-project is applied causes ExpoRootProjectPlugin's
 * setIfNotExist() to keep our value.
 */
function withNdkVersion(config, ndkVersion) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const marker = 'apply plugin: "expo-root-project"';

    if (contents.includes('ext.ndkVersion')) {
      // Already patched – update the value in case it changed.
      config.modResults.contents = contents.replace(
        /ext\.ndkVersion\s*=\s*"[^"]*"/,
        `ext.ndkVersion = "${ndkVersion}"`
      );
    } else {
      config.modResults.contents = contents.replace(
        marker,
        `ext.ndkVersion = "${ndkVersion}"\n${marker}`
      );
    }

    return config;
  });
}

module.exports = withNdkVersion;
