import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, Resource, type SolanaAddress } from "x402-express";
config();

// allow reasonable defaults if env variables are missing
const facilitatorUrl = (process.env.FACILITATOR_URL as Resource) || "https://x402.org/facilitator";
let payTo = process.env.ADDRESS as `0x${string}` | SolanaAddress | undefined;

if (!payTo) {
  console.warn("ADDRESS environment variable not set; payments will use whatever payTo comes from the client");
}

const app = express();

// apply payment middleware directly (no wrapper necessary)
app.use(
  paymentMiddleware(payTo!, /* payTo may be undefined but middleware handles it */
    {
      "GET /weather": {
        // USDC amount in dollars
        price: "$0.0001",
        network: "base-sepolia",
        // give a very long timeout to avoid authorization expiry (30 days)
        maxTimeoutSeconds: 2592000,
      },
      "/premium/*": {
        // Define atomic amounts in any EIP-3009 token
        price: {
          amount: "100000",
          asset: {
            address: "0xabc",
            decimals: 18,
            // omit eip712 for Solana
            eip712: {
              name: "WETH",
              version: "1",
            },
          },
        },
        network: "base-sepolia",
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content",
  });
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:${4021}`);
});
