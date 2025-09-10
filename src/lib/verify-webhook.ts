import * as forge from "node-forge";

// export async function fetchKickWebhookPublicKey(): Promise<string> {
//   // TODO: This might not be a request it can be downloaded, it can be changed if any peformance issue comes up.

//   const kickPublicKey = await fetch("https://api.kick.com/public/v1/public-key")
//     .then((res) => res.json())
//     .then((data) => data.data.public_key);

//   console.log("Fetched Kick Public Key:", kickPublicKey);
//   return kickPublicKey;
// }

/**
 * Parse a PEM encoded public key
 */
export function parsePublicKey(pemKey: string): forge.pki.rsa.PublicKey {
  try {
    return forge.pki.publicKeyFromPem(pemKey);
  } catch (error) {
    throw new Error("Failed to parse public key: " + error);
  }
}

/**
 * Verify a webhook signature from Kick
 *
 * @param publicKey The RSA public key from Kick
 * @param body The raw request body as a string
 * @param messageId The Kick-Message-Id header value
 * @param timestamp The Kick-Timestamp header value
 * @param signature The Kick-Event-Signature header value (base64 encoded)
 * @returns boolean indicating if the signature is valid
 */
export function verifyWebhookSignature(
  publicKey: forge.pki.rsa.PublicKey,
  body: string,
  messageId: string,
  timestamp: string,
  signature: string
): boolean {
  try {
    // Create the data to verify (messageId.timestamp.body)
    const dataToVerify = `${messageId}.${timestamp}.${body}`;

    // Create a message digest
    const md = forge.md.sha256.create();
    md.update(dataToVerify, "utf8");

    // Decode the base64 signature
    const decodedSignature = forge.util.decode64(signature);

    // Verify the signature
    return publicKey.verify(md.digest().bytes(), decodedSignature);
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

// The Kick public key (from your example)
export const kickPublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----
`;
