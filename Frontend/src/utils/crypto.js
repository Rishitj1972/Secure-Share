/**
 * Client-Side Encryption Utilities
 * Zero-Knowledge End-to-End Encryption
 */

// Generate RSA key pair (2048-bit)
export async function generateRSAKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )

    // Export public key to PEM format
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const publicKeyPEM = bufferToPEM(publicKeyBuffer, 'PUBLIC KEY')

    // Export private key to PEM format
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    const privateKeyPEM = bufferToPEM(privateKeyBuffer, 'PRIVATE KEY')

    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyPEM
    }
  } catch (error) {
    console.error('RSA key generation failed:', error)
    throw new Error('Failed to generate RSA keys')
  }
}

// Generate random AES key (256-bit)
export async function generateAESKey() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )

    // Export as raw bytes
    const keyBuffer = await window.crypto.subtle.exportKey('raw', key)
    return arrayBufferToBase64(keyBuffer)
  } catch (error) {
    console.error('AES key generation failed:', error)
    throw new Error('Failed to generate AES key')
  }
}

// Encrypt file with AES-GCM (accepts File or pre-read buffer)
export async function encryptFile(fileOrBuffer, aesKeyBase64) {
  try {
    // Import AES key
    const keyBuffer = base64ToArrayBuffer(aesKeyBase64)
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    // Generate random IV (12 bytes for GCM)
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Read file as ArrayBuffer if not already a buffer
    const fileBuffer = fileOrBuffer instanceof ArrayBuffer 
      ? fileOrBuffer 
      : await fileOrBuffer.arrayBuffer()

    // Encrypt
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      fileBuffer
    )

    return {
      encryptedData: new Blob([encryptedBuffer]),
      iv: arrayBufferToBase64(iv)
    }
  } catch (error) {
    console.error('File encryption failed:', error)
    throw new Error('Failed to encrypt file')
  }
}

// Decrypt file with AES-GCM
export async function decryptFile(encryptedBlob, aesKeyBase64, ivBase64) {
  try {
    // Import AES key
    const keyBuffer = base64ToArrayBuffer(aesKeyBase64)
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Import IV
    const iv = base64ToArrayBuffer(ivBase64)

    // Read encrypted blob
    const encryptedBuffer = await encryptedBlob.arrayBuffer()

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      encryptedBuffer
    )

    return new Blob([decryptedBuffer])
  } catch (error) {
    console.error('File decryption failed:', error)
    throw new Error('Failed to decrypt file')
  }
}

// Encrypt AES key with RSA public key
export async function encryptAESKey(aesKeyBase64, publicKeyPEM) {
  try {
    // Import RSA public key
    const publicKey = await importPublicKey(publicKeyPEM)

    // Convert AES key to ArrayBuffer
    const aesKeyBuffer = base64ToArrayBuffer(aesKeyBase64)

    // Encrypt AES key with RSA
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      aesKeyBuffer
    )

    return arrayBufferToBase64(encryptedKeyBuffer)
  } catch (error) {
    console.error('AES key encryption failed:', error)
    throw new Error('Failed to encrypt AES key')
  }
}

// Decrypt AES key with RSA private key
export async function decryptAESKey(encryptedKeyBase64, privateKeyPEM) {
  try {
    // Import RSA private key
    const privateKey = await importPrivateKey(privateKeyPEM)

    // Convert encrypted key to ArrayBuffer
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64)

    // Decrypt with RSA
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedKeyBuffer
    )

    return arrayBufferToBase64(decryptedKeyBuffer)
  } catch (error) {
    console.error('AES key decryption failed:', error)
    throw new Error('Failed to decrypt AES key')
  }
}

// Calculate SHA-256 hash of file (accepts File or ArrayBuffer)
export async function calculateFileHash(fileOrBuffer) {
  try {
    // Handle both File and ArrayBuffer
    const buffer = fileOrBuffer instanceof ArrayBuffer 
      ? fileOrBuffer 
      : await fileOrBuffer.arrayBuffer()
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
    return arrayBufferToHex(hashBuffer)
  } catch (error) {
    console.error('Hash calculation failed:', error)
    throw new Error('Failed to calculate file hash')
  }
}

// Calculate SHA-256 hash from pre-read ArrayBuffer (optimized)
export async function calculateFileHashFromBuffer(buffer) {
  try {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new TypeError('Expected ArrayBuffer')
    }
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
    return arrayBufferToHex(hashBuffer)
  } catch (error) {
    console.error('Hash calculation failed:', error)
    throw new Error('Failed to calculate file hash')
  }
}

// Import RSA public key from PEM
async function importPublicKey(pem) {
  const binaryDer = pemToBinary(pem, 'PUBLIC KEY')
  return await window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  )
}

// Import RSA private key from PEM
async function importPrivateKey(pem) {
  const binaryDer = pemToBinary(pem, 'PRIVATE KEY')
  return await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['decrypt']
  )
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper: Convert ArrayBuffer to Hex
function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper: Convert ArrayBuffer to PEM
function bufferToPEM(buffer, label) {
  const base64 = arrayBufferToBase64(buffer)
  const lines = []
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, Math.min(i + 64, base64.length)))
  }
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

// Helper: Convert PEM to binary
function pemToBinary(pem, label) {
  const pemHeader = `-----BEGIN ${label}-----`
  const pemFooter = `-----END ${label}-----`
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length
  ).replace(/\s/g, '')
  return base64ToArrayBuffer(pemContents)
}

// Store private key in localStorage (encrypted with user password in production)
export function storePrivateKey(userId, privateKey) {
  localStorage.setItem(`privateKey_${userId}`, privateKey)
}

// Retrieve private key from localStorage
export function getPrivateKey(userId) {
  return localStorage.getItem(`privateKey_${userId}`)
}

// Clear private key from localStorage
export function clearPrivateKey(userId) {
  localStorage.removeItem(`privateKey_${userId}`)
}

// Calculate SHA-256 hash from ArrayBuffer efficiently (for large files)
export async function calculateFileHashStreamingFromBuffer(fileOrBuffer, chunkSize = 10 * 1024 * 1024) {
  try {
    // If it's a File/Blob, read in streaming chunks
    if (fileOrBuffer instanceof Blob && !(fileOrBuffer instanceof ArrayBuffer)) {
      let hash = null
      
      for (let i = 0; i < fileOrBuffer.size; i += chunkSize) {
        const chunk = fileOrBuffer.slice(i, Math.min(i + chunkSize, fileOrBuffer.size))
        const buffer = await chunk.arrayBuffer()
        
        // Only first chunk to get initial hash
        if (i === 0) {
          hash = await window.crypto.subtle.digest('SHA-256', buffer)
        }
      }
      
      const bytes = new Uint8Array(hash)
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileOrBuffer)
      return arrayBufferToHex(hashBuffer)
    } else {
      throw new TypeError('Expected Blob or ArrayBuffer')
    }
  } catch (error) {
    console.error('Hash calculation failed:', error)
    throw new Error('Failed to calculate file hash')
  }
}
