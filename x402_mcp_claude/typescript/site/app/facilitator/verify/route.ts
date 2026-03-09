import {
  PaymentPayload,
  PaymentPayloadSchema,
  PaymentRequirements,
  PaymentRequirementsSchema,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  VerifyResponse,
  createConnectedClient,
  createSigner,
} from "x402/types";
import { verify } from "x402/facilitator";

type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

/**
 * Handles POST requests to verify x402 payments
 *
 * @param req - The incoming request containing payment verification details
 * @returns A JSON response indicating whether the payment is valid
 */
export async function POST(req: Request) {
  const body: VerifyRequest = await req.json();

  const network = body.paymentRequirements.network;

  // Debug logs to help diagnose verification failures (network mismatch, wrong receiver, etc.)
  // These will appear in the Next.js server console during verify requests.
  // eslint-disable-next-line no-console
  console.log('[x402][verify] incoming verify request', {
    network,
    paymentPayload: body.paymentPayload?.payload ? '(payload present)' : '(no payload)',
    paymentRequirements: body.paymentRequirements,
  });
  // If development bypass is enabled, short-circuit early
  if (process.env.SKIP_X402_VERIFY === 'true') {
    // eslint-disable-next-line no-console
    console.warn('[x402][verify] SKIP_X402_VERIFY enabled, returning success without on-chain check');
    return Response.json({ isValid: true } as VerifyResponse);
  }

  let client;
  try {
    client = SupportedEVMNetworks.includes(network)
      ? createConnectedClient(body.paymentRequirements.network)
      : SupportedSVMNetworks.includes(network)
        ? await createSigner(network, process.env.SOLANA_PRIVATE_KEY)
        : undefined;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[x402][verify] error creating client for network', network, err);
    return Response.json(
      {
        isValid: false,
        // Use a permitted VerifyResponse invalidReason value
        invalidReason: 'unexpected_verify_error',
      } as VerifyResponse,
      { status: 500 },
    );
  }

  if (!client) {
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_network",
      } as VerifyResponse,
      { status: 400 },
    );
  }

  let paymentPayload: PaymentPayload;
  try {
    paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);
  } catch (error) {
    console.error("Invalid payment payload:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_payload",
        payer:
          body.paymentPayload?.payload && "authorization" in body.paymentPayload.payload
            ? body.paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 400 },
    );
  }

  let paymentRequirements: PaymentRequirements;
  try {
    paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);
  } catch (error) {
    console.error("Invalid payment requirements:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_payment_requirements",
        payer:
          "authorization" in paymentPayload.payload
            ? paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 400 },
    );
  }

  // Sanity check: ensure the paymentRequirements.payTo matches our configured resource wallet.
  // This catches the common mistake where the payer sent funds to a different address than
  // the resource server expects (causing verification to fail on-chain).
  let configuredPayTo = process.env.RESOURCE_WALLET_ADDRESS;
  if (!configuredPayTo) {
    // fallback: if the environment variable is missing, just trust whatever the
    // paywall generated. This avoids spurious 402s during local testing.
    // eslint-disable-next-line no-console
    console.warn('[x402][verify] RESOURCE_WALLET_ADDRESS not set; falling back to payTo from requirements');
    configuredPayTo = paymentRequirements.payTo;
  }

  const normalize = (addr: string) => (addr && addr.startsWith("0x") ? addr.toLowerCase() : addr);
  try {
    if (normalize(paymentRequirements.payTo) !== normalize(configuredPayTo)) {
      // eslint-disable-next-line no-console
      console.warn('[x402][verify] payTo mismatch between paymentRequirements and RESOURCE_WALLET_ADDRESS', {
        expected: configuredPayTo,
        actual: paymentRequirements.payTo,
      });
      return Response.json(
        {
          isValid: false,
          // Use a permitted ErrorReasons value that indicates recipient mismatch
          invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
          payer:
            "authorization" in paymentPayload.payload
              ? paymentPayload.payload.authorization.from
              : "",
        } as VerifyResponse,
        { status: 402 },
      );
    }
  } catch (err) {
    // If normalization/comparison errors, continue to regular verification but log.
    // eslint-disable-next-line no-console
    console.error('[x402][verify] error while comparing payTo addresses', err);
  }

  // helper to attempt verify several times for transient errors
  async function verifyWithRetry(attempts = 2): Promise<VerifyResponse> {
    let last: VerifyResponse | undefined;
    for (let i = 0; i < attempts; i++) {
      // eslint-disable-next-line no-console
      console.log('[x402][verify] attempt', i + 1, 'of', attempts);
      // eslint-disable-next-line no-console
      console.log('[x402][verify] invoking verify() with', {
        paymentPayload,
        paymentRequirements,
      });

      const result = await verify(client, paymentPayload, paymentRequirements);
      // eslint-disable-next-line no-console
      console.log('[x402][verify] verify result', result);

      if (result.isValid) {
        return result;
      }

      last = result;
      // if the failure is a known transient reason, wait and retry
      if (
        (result.invalidReason === 'invalid_payment' || result.invalidReason === 'unexpected_verify_error') &&
        i + 1 < attempts
      ) {
        // eslint-disable-next-line no-console
        console.warn('[x402][verify] transient failure, retrying after delay');
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      break;
    }
    return last!;
  }

  try {
    const valid = await verifyWithRetry(2);
    return Response.json(valid);
  } catch (error) {
    console.error("Error verifying payment:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "unexpected_verify_error",
        payer:
          "authorization" in paymentPayload.payload
            ? paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 500 },
    );
  }
}

/**
 * Provides API documentation for the verify endpoint
 *
 * @returns A JSON response describing the verify endpoint and its expected request body
 */
export async function GET() {
  return Response.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
}
