import { Address } from "viem";
import { paymentMiddleware, Resource, Network } from "x402-next";
import { NextRequest, NextResponse } from "next/server";

const address = process.env.RESOURCE_WALLET_ADDRESS as Address;

// NETWORK should be one of the supported network strings (e.g. "base-sepolia").
// Default to `base-sepolia` when not provided to avoid common misconfiguration
// during local testing on Base Sepolia / Base testnets.
let network = process.env.NETWORK as Network | undefined;
if (!network) {
  // eslint-disable-next-line no-console
  console.warn('Environment variable NETWORK is not set — defaulting to "base-sepolia"');
  network = 'base-sepolia' as Network;
}

// The facilitator URL used by the middleware to request payment verification/settlement.
// If NEXT_PUBLIC_FACILITATOR_URL is provided it must be a full URL like
// `https://example.com/facilitator` to satisfy the library's `Resource` type.
// If it's not set we omit the facilitator config and let the library fall back
// to its own default (https://x402.org/facilitator).
const facilitatorUrlFromEnv = process.env.NEXT_PUBLIC_FACILITATOR_URL;
const facilitatorConfig = facilitatorUrlFromEnv
  ? ({ url: facilitatorUrlFromEnv as Resource } as { url: Resource })
  : undefined;

const cdpClientKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

if (!address) {
  // eslint-disable-next-line no-console
  console.warn('Environment variable RESOURCE_WALLET_ADDRESS is not set — payments may not be received by the expected wallet');
}

// List of blocked countries and regions
const BLOCKED_COUNTRIES = [
  "KP", // North Korea
  "IR", // Iran
  "CU", // Cuba
  "SY", // Syria
];

// List of blocked regions within specific countries
const BLOCKED_REGIONS = {
  UA: ["43", "14", "09"],
};

const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    "/protected": {
      price: "$0.01",
      config: {
        description: "Access to protected content",
      },
      network,
    },
  },
  facilitatorConfig,
  {
    cdpClientKey,
    appLogo: "/logos/x402-examples.png",
    appName: "x402 Demo",
    sessionTokenEndpoint: "/api/x402/session-token",
  },
);

const geolocationMiddleware = async (req: NextRequest) => {
  // Get the country and region from Vercel's headers
  const country = req.headers.get("x-vercel-ip-country") || "US";
  const region = req.headers.get("x-vercel-ip-country-region");

  const isCountryBlocked = BLOCKED_COUNTRIES.includes(country);
  const isRegionBlocked =
    region && BLOCKED_REGIONS[country as keyof typeof BLOCKED_REGIONS]?.includes(region);

  if (isCountryBlocked || isRegionBlocked) {
    return new NextResponse("Access denied: This service is not available in your region", {
      status: 451,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return null;
};

export const middleware = async (req: NextRequest) => {
  const geolocationResponse = await geolocationMiddleware(req);
  if (geolocationResponse) {
    return geolocationResponse;
  }
  const delegate = x402PaymentMiddleware as unknown as (
    request: NextRequest,
  ) => ReturnType<typeof x402PaymentMiddleware>;
  return delegate(req);
};

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/", // Include the root path explicitly
  ],
};
