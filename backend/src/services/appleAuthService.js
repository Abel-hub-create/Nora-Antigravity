import { createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
let cachedKeys = null;
let cacheExpiry = 0;

const getApplePublicKeys = async () => {
  if (cachedKeys && Date.now() < cacheExpiry) return cachedKeys;

  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error('Failed to fetch Apple public keys');
  const { keys } = await res.json();
  cachedKeys = keys;
  cacheExpiry = Date.now() + 60 * 60 * 1000; // cache 1h
  return keys;
};

/**
 * Verify an Apple identity token and extract user info
 * @param {string} identityToken - The id_token from Apple Sign-In
 * @returns {Promise<{ appleId, email, emailVerified }>}
 */
export const verifyAppleToken = async (identityToken) => {
  // Decode header to get key id
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded) {
    const err = new Error('Invalid Apple token');
    err.statusCode = 401;
    throw err;
  }

  const { kid } = decoded.header;
  const keys = await getApplePublicKeys();
  const jwk = keys.find((k) => k.kid === kid);

  if (!jwk) {
    // Retry once with fresh keys in case of rotation
    cachedKeys = null;
    const freshKeys = await getApplePublicKeys();
    const freshJwk = freshKeys.find((k) => k.kid === kid);
    if (!freshJwk) {
      const err = new Error('Apple public key not found');
      err.statusCode = 401;
      throw err;
    }
  }

  const targetJwk = (cachedKeys || []).find((k) => k.kid === kid) || jwk;
  const publicKey = createPublicKey({ key: targetJwk, format: 'jwk' });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });

  let payload;
  try {
    payload = jwt.verify(identityToken, pem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID
    });
  } catch (error) {
    const err = new Error('Apple token verification failed: ' + error.message);
    err.statusCode = 401;
    throw err;
  }

  return {
    appleId: payload.sub,
    email: payload.email || null,
    emailVerified: payload.email_verified === 'true' || payload.email_verified === true
  };
};
