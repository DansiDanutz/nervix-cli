import nacl from "tweetnacl";

export function generateKeypair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: Buffer.from(kp.publicKey).toString("hex"),
    secretKey: Buffer.from(kp.secretKey).toString("hex"),
  };
}

export function signMessage(message, secretKeyHex) {
  const secretKey = Buffer.from(secretKeyHex, "hex");
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return Buffer.from(signature).toString("hex");
}

export function getPublicKeyFromSecret(secretKeyHex) {
  const secretKey = Buffer.from(secretKeyHex, "hex");
  // Ed25519 secret key is 64 bytes: first 32 seed + last 32 public
  return Buffer.from(secretKey.subarray(32)).toString("hex");
}
