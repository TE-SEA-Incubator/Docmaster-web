import { promises as fs } from 'fs';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

function getMimeType(relPath?: string, fallback = 'application/octet-stream') {
  if (!relPath) return fallback;
  const ext = path.extname(relPath).toLowerCase();
  return MIME_MAP[ext] || fallback;
}

function isBufferLike(value: any) {
  return Boolean(
    value && (
      (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) ||
      (value.type === 'Buffer' && Array.isArray(value.data)) ||
      ArrayBuffer.isView(value) ||
      value instanceof ArrayBuffer
    )
  );
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return null;
}

function bufferLikeToDataUrl(value: any, mime = 'application/octet-stream') {
  let bytes: Uint8Array | null = null;

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    bytes = new Uint8Array(value);
  } else if (value?.type === 'Buffer' && Array.isArray(value.data)) {
    bytes = Uint8Array.from(value.data);
  } else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else if (value instanceof ArrayBuffer) {
    bytes = new Uint8Array(value);
  }

  if (!bytes) return null;

  const base64 = bytesToBase64(bytes);
  return base64 ? toDataUrl(base64, mime) : null;
}

export async function readFileAsBase64(relPath: string) {
  if (!relPath) throw new Error('Path required');
  // Resolve relative stored paths like "uploads/documents/xxx"
  const abs = path.resolve(process.cwd(), relPath);
  try {
    const data = await fs.readFile(abs);
    const mime = getMimeType(relPath);
    return {
      filename: path.basename(relPath),
      mime,
      base64: data.toString('base64')
    };
  } catch (err) {
    console.error(`Error reading file at ${abs}:`, err);
    return null;
  }
}

export async function fileExists(relPath: string) {
  if (!relPath) return false;
  try {
    const abs = path.resolve(process.cwd(), relPath);
    await fs.access(abs);
    return true;
  } catch (e) {
    return false;
  }
}

export function toDataUrl(base64: string, mime: string) {
  return `data:${mime};base64,${base64}`;
}

function serializeMediaValue(value: any, relPath?: string) {
  if (!value) return value;

  if (typeof value === 'string') {
    return value.startsWith('data:') ? value : value;
  }

  if (typeof value === 'object') {
    if (typeof value.dataUrl === 'string') return value.dataUrl;
    if (typeof value.base64 === 'string') {
      return toDataUrl(value.base64, value.mime || value.mimeType || getMimeType(relPath));
    }

    const bufferDataUrl = bufferLikeToDataUrl(value, value.mime || value.mimeType || getMimeType(relPath));
    if (bufferDataUrl) return bufferDataUrl;

    if (typeof value.path === 'string') return value.path;
  }

  return value;
}

/**
 * Automatically encodes image fields in an object or array of objects.
 * Target fields: photo_recto, photo_verso, photos, photo_url, counterPartPhotoRecto, counterPartPhotoVerso
 */
export async function encodeMediaFields(data: any): Promise<any> {
  if (!data) return data;

  if (Array.isArray(data)) {
    return Promise.all(data.map(item => encodeMediaFields(item)));
  }

  if (typeof data !== 'object' || isBufferLike(data) || data instanceof Date) return data;

  const result = { ...data };
  const imageFields = [
    'photo_recto', 
    'photo_verso', 
    'photo_url', 
    'counterPartPhotoRecto', 
    'counterPartPhotoVerso',
    'photo_facture',
    'photo_face',
    'photo_serial',
    'profile_photo',
    'avatar_url',
    'document_photo'
  ];

  for (const key in result) {
    if (imageFields.includes(key)) {
      const currentValue = result[key];

      if (isBufferLike(currentValue) || (currentValue && typeof currentValue === 'object' && typeof currentValue.dataUrl === 'string')) {
        result[key] = serializeMediaValue(currentValue, currentValue?.filename || currentValue?.path);
        continue;
      }

      if (currentValue && typeof currentValue === 'string' && !currentValue.startsWith('data:')) {
        if (await fileExists(currentValue)) {
          const encoded = await readFileAsBase64(currentValue);
          if (encoded) {
            result[key] = toDataUrl(encoded.base64, encoded.mime);
          }
        } else {
          console.warn(`⚠️ [MediaUtils] File not found for field ${key}: ${result[key]}`);
        }
      }

      continue;
    }

    // Recursive call for nested objects (that are not null)
    if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]) && !isBufferLike(result[key])) {
      result[key] = await encodeMediaFields(result[key]);
      continue;
    }
  }

  // Handle 'photos' field which is often an array in devices
  if (result.photos && Array.isArray(result.photos)) {
    result.photos = await Promise.all(result.photos.map(async (p: any) => {
      if (isBufferLike(p)) {
        return serializeMediaValue(p);
      }

      if (typeof p === 'string' && !p.startsWith('data:') && await fileExists(p)) {
        const encoded = await readFileAsBase64(p);
        return encoded ? toDataUrl(encoded.base64, encoded.mime) : p;
      }

      if (typeof p === 'object') {
        const encoded = serializeMediaValue(p, p?.filename || p?.path);
        return typeof encoded === 'string' ? encoded : p;
      }

      return p;
    }));
  }

  return result;
}
