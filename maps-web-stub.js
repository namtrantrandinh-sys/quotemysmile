// Web stub for react-native-maps — the package uses native-only codegen.
// On native, the real module is loaded. On web, just no-ops so the bundler
// can build the routes that import MapView.
const React = require("react");
const { View } = require("react-native");

const Stub = ({ children, ...rest }) =>
  React.createElement(View, rest, children);

module.exports = {
  default: Stub,
  Marker: Stub,
  Circle: Stub,
  Polygon: Stub,
  Polyline: Stub,
  Callout: Stub,
  Overlay: Stub,
  Heatmap: Stub,
  Geojson: Stub,
  PROVIDER_DEFAULT: "default",
  PROVIDER_GOOGLE: "google",
};
