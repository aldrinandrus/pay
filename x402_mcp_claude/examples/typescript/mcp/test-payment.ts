import axios from "axios";
import { config } from "dotenv";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

config({ override: true });

const privateKey = process.env.PRIVATE_KEY as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string;
const endpointPath = process.env.ENDPOINT_PATH as string;
if (!privateKey || !baseURL || !endpointPath) {
  throw new Error("Missing environment variables");
}

const account = privateKeyToAccount(privateKey);
const client = withPaymentInterceptor(axios.create({ baseURL }), account);

client.interceptors.request.use((req) => {
  console.log("[test] outgoing headers", req.headers);
  return req;
});
client.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[test] response error", err.response?.status, err.response?.data);
    return Promise.reject(err);
  },
);

(async () => {
  try {
    const res = await client.get(endpointPath);
    console.log("[test] success", res.data);
  } catch (e) {
    // already logged
  }
})();