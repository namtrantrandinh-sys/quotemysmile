const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Web preview: replace @stripe/stripe-react-native with a no-op stub.
// Stripe's RN SDK uses native-only codegen that Metro can't bundle for web.
// iOS and Android still bundle the real package; only web hits the stub.
const stripeStub = path.resolve(__dirname, "stripe-web-stub.js");
const mapsStub = path.resolve(__dirname, "maps-web-stub.js");
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    if (
      moduleName === "@stripe/stripe-react-native" ||
      moduleName.startsWith("@stripe/stripe-react-native/")
    ) {
      return { type: "sourceFile", filePath: stripeStub };
    }
    if (moduleName === "react-native-maps" || moduleName.startsWith("react-native-maps/")) {
      return { type: "sourceFile", filePath: mapsStub };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
