// Web-only stub for @stripe/stripe-react-native.
// Stripe's RN SDK uses native-only codegen that Metro can't bundle for
// web. We replace it with no-op shims so the web preview boots; iOS and
// Android continue to import the real module via the platform extension.
// (Metro picks `stripe-web-stub.web.js` automatically over `.js`? — no, we
// configure it explicitly via resolver.alias in metro.config.js.)
const React = require("react");

const noop = () => {};
const noopAsync = async () => ({});

function PassThrough({ children }) {
  return children ?? null;
}

const useStripe = () => ({
  initPaymentSheet: noopAsync,
  presentPaymentSheet: noopAsync,
  confirmPayment: noopAsync,
});

module.exports = {
  StripeProvider: PassThrough,
  useStripe,
  CardField: () => null,
  PlatformPay: {},
  PlatformPayButton: () => null,
  isPlatformPaySupported: noopAsync,
  default: PassThrough,
};
