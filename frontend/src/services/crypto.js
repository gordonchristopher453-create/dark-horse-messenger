/**
 * Dark Horse Messenger - E2E Encryption Service
 * Uses Web Crypto API (RSA-OAEP + AES-GCM)
 */

const KEY_PREFIX = 'dhm_privkey_'

// ─── Key Generation ───────────────────────────────────────────

export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  )
  return keyPair
}

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

export const exportPrivateKey = async (privateKey) => {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

export const importPublicKey = async (base64Key) => {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return window.crypto.subtle.importKey(
    'spki', binary.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['encrypt']
  )
}

export const importPrivateKey = async (base64Key) => {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return window.crypto.subtle.importKey(
    'pkcs8', binary.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['decrypt']
  )
}

// ─── Private Key Storage (encrypted with password) ────────────

const deriveKeyFromPassword = async (password, salt) => {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  )
}

export const storePrivateKey = async (userId, privateKey, password) => {
  const privKeyBase64 = await exportPrivateKey(privateKey)
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const derivedKey = await deriveKeyFromPassword(password, salt)
  const enc = new TextEncoder()
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    enc.encode(privKeyBase64)
  )
  const payload = {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  }
  localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(payload))
}

export const loadPrivateKey = async (userId, password) => {
  const stored = localStorage.getItem(KEY_PREFIX + userId)
  if (!stored) return null
  try {
    const { salt, iv, data } = JSON.parse(stored)
    const saltArr = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    const ivArr = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    const dataArr = Uint8Array.from(atob(data), c => c.charCodeAt(0))
    const derivedKey = await deriveKeyFromPassword(password, saltArr)
    const dec = new TextDecoder()
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArr }, derivedKey, dataArr)
    return importPrivateKey(dec.decode(decrypted))
  } catch {
    return null
  }
}

export const hasStoredKey = (userId) => !!localStorage.getItem(KEY_PREFIX + userId)

// ─── DM Encryption (RSA-OAEP) ─────────────────────────────────

export const encryptForRecipient = async (text, recipientPublicKeyBase64) => {
  try {
    const recipientKey = await importPublicKey(recipientPublicKeyBase64)
    const enc = new TextEncoder()
    const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientKey, enc.encode(text))
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  } catch {
    return text // fallback: send plain if encryption fails
  }
}

export const decryptMessage = async (encryptedBase64, privateKey) => {
  try {
    const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    const decrypted = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return encryptedBase64 // fallback: return as-is if decryption fails
  }
}

// ─── Group Encryption (AES-GCM + RSA per member) ──────────────

export const encryptForGroup = async (text, memberPublicKeys) => {
  // Generate a one-time AES key for this message
  const aesKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encryptedContent = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(text))
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey)

  // Encrypt the AES key for each member
  const encryptedKeys = {}
  for (const [userId, publicKeyBase64] of Object.entries(memberPublicKeys)) {
    try {
      const pubKey = await importPublicKey(publicKeyBase64)
      const encKey = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, exportedAesKey)
      encryptedKeys[userId] = btoa(String.fromCharCode(...new Uint8Array(encKey)))
    } catch { /* skip member if key invalid */ }
  }

  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    iv: btoa(String.fromCharCode(...iv)),
    encryptedKeys // { userId: encryptedAesKey }
  }
}

export const decryptGroupMessage = async (encryptedContent, ivBase64, encryptedKeys, userId, privateKey) => {
  try {
    const encryptedAesKey = encryptedKeys[userId]
    if (!encryptedAesKey) return '[encrypted]'
    const aesKeyData = Uint8Array.from(atob(encryptedAesKey), c => c.charCodeAt(0))
    const aesKeyRaw = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, aesKeyData)
    const aesKey = await window.crypto.subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    const content = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0))
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, content)
    return new TextDecoder().decode(decrypted)
  } catch {
    return '[encrypted]'
  }
}
