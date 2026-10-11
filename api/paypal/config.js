/**
 * What the checkout page needs before it can show a PayPal button: the public
 * client id and which PayPal environment to talk to. The secret stays on the
 * server, where the other two functions use it.
 */
import {
  CURRENCY,
  catalogIds,
  jsonResponse,
  methodNotAllowed,
  paypalClientId,
  paypalConfigured,
  paypalEnvironmentName,
} from "./_lib.js";

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    methodNotAllowed(res, "GET");
    return;
  }

  const configured = paypalConfigured();
  jsonResponse(res, 200, {
    // False until both keys are in the deployment's environment variables.
    enabled: configured,
    // Never the client secret — only what a browser needs.
    clientId: configured ? paypalClientId() : "",
    environment: paypalEnvironmentName(),
    currency: CURRENCY,
    sellable: catalogIds(),
  });
}
