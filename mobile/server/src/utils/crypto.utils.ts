import crypto from 'crypto';

/**
 * Generate a SHA-256 hash (fingerprint) for a document
 */
export const calculateDocumentFingerprint = (typeDoc: string, numeroDoc: string): string => {
  // Normalize inputs: lowercase and remove spaces/special characters
  const normalizedType = typeDoc.toLowerCase().trim();
  const normalizedNumber = numeroDoc.toLowerCase().replace(/[^a-z0-9]/g, '');

  const data = `${normalizedType}:${normalizedNumber}`;
  
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
};
