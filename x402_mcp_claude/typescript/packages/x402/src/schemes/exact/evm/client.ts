import { Address, Chain, LocalAccount, Transport } from "viem";
import { isSignerWallet, SignerWallet } from "../../../types/shared/evm";
import { createEvmRpcClient } from "../../../shared/evm/rpc";
import { PaymentPayload, PaymentRequirements, UnsignedPaymentPayload } from "../../../types/verify";
import { createNonce, signAuthorization } from "./sign";
import { encodePayment } from "./utils/paymentUtils";

/**
 * Prepares an unsigned payment header with the given sender address and payment requirements.
 *
 * @param from - The sender's address from which the payment will be made
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns An unsigned payment payload containing authorization details
 */
export async function preparePaymentHeader(
  from: Address,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<UnsignedPaymentPayload> {
  const nonce = createNonce();

  // determine current time using both system clock and blockchain timestamp.
  // choose the minimum of the two so we never generate a validAfter in the future
  const systemNow = Math.floor(Date.now() / 1000);
  let chainNow = systemNow;
  try {
    const rpcClient = createEvmRpcClient(paymentRequirements.network);
    const block = await rpcClient.getBlock({ blockTag: "latest" });
    if (block && block.timestamp !== undefined) {
      chainNow = Number(block.timestamp);
    }
  } catch (err) {
    // ignore errors, we'll fallback to system time
  }
  // start from the earliest clock we trust (system or chain) so that
  // validAfter never lies in the future for either clock.  We also apply
  // a small negative buffer to account for slight drift.  This choice keeps
  // the authorization valid when the resource server checks it using its own
  // local time (system clock).  However, if the blockchain has progressed far
  // beyond "now", simply using this base window could result in the entire
  // authorization being in the past on-chain, causing settlement to revert
  // with "authorization is expired".  To avoid that we make sure the end of
  // the window extends at least to the current chain timestamp.
  const now = Math.min(systemNow, chainNow);

  const bufferSeconds = 600; // keep the validAfter slightly in the past
  let validAfterNumber = now - bufferSeconds;
  let validBeforeNumber = now + paymentRequirements.maxTimeoutSeconds;

  // if the chain has already moved past the naive window, extend the
  // expiration so that the current block time is included.  We leave the
  // start of the window as system-based (minimum clock) to satisfy resource
  // servers that may compare against local time.
  if (chainNow > validBeforeNumber) {
    validBeforeNumber = chainNow + paymentRequirements.maxTimeoutSeconds;
  }

  const validAfter = BigInt(validAfterNumber).toString();
  const validBefore = BigInt(validBeforeNumber).toString();

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined,
      authorization: {
        from,
        to: paymentRequirements.payTo as Address,
        value: paymentRequirements.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

/**
 * Signs a payment header using the provided client and payment requirements.
 *
 * @param client - The signer wallet instance used to sign the payment header
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param unsignedPaymentHeader - The unsigned payment payload to be signed
 * @returns A promise that resolves to the signed payment payload
 */
export async function signPaymentHeader<transport extends Transport, chain extends Chain>(
  client: SignerWallet<chain, transport> | LocalAccount,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<PaymentPayload> {
  const { signature } = await signAuthorization(
    client,
    unsignedPaymentHeader.payload.authorization,
    paymentRequirements,
  );

  return {
    ...unsignedPaymentHeader,
    payload: {
      ...unsignedPaymentHeader.payload,
      signature,
    },
  };
}

/**
 * Creates a complete payment payload by preparing and signing a payment header.
 *
 * @param client - The signer wallet instance used to create and sign the payment
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns A promise that resolves to the complete signed payment payload
 */
export async function createPayment<transport extends Transport, chain extends Chain>(
  client: SignerWallet<chain, transport> | LocalAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const from = isSignerWallet(client) ? client.account!.address : client.address;
  const unsignedPaymentHeader = await preparePaymentHeader(from, x402Version, paymentRequirements);
  return signPaymentHeader(client, paymentRequirements, unsignedPaymentHeader);
}

/**
 * Creates and encodes a payment header for the given client and payment requirements.
 *
 * @param client - The signer wallet instance used to create the payment header
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns A promise that resolves to the encoded payment header string
 */
export async function createPaymentHeader(
  client: SignerWallet | LocalAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await createPayment(client, x402Version, paymentRequirements);
  return encodePayment(payment);
}
