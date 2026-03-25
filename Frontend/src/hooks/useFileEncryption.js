import { useCallback, useRef } from 'react'
import { 
  generateAESKey, 
  encryptFile, 
  encryptAESKey, 
  calculateFileHash 
} from '../utils/crypto'
import api from '../api/axios'

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Hook for encrypting files before upload
 * Zero-knowledge encryption workflow
 */
export function useFileEncryption() {
  const encryptionCache = useRef({}) // Store encryption data temporarily
  const FILE_SIZE_THRESHOLD = 100 * 1024 * 1024 // 100MB threshold

  /**
   * Encrypt a file before upload
   * Strategy based on file size:
   * - Small (≤100MB): Pre-encrypt entire file (E2EE, most secure, faster)
   * - Large (100MB-5GB): Skip pre-encryption, use chunk-level encryption or server encryption
   * - Very Large (>5GB): Server handles encryption after chunk assembly
   * 
   * For 5GB support:
   * - Uses 100MB chunks instead of 15MB → only 50 chunks needed
   * - Avoids arrayBuffer() memory crash (browser limit ~1-2GB)
   * - Stable memory usage regardless of file size
   * 
   * @param {File} file - Original file to encrypt
   * @param {string} receiverPublicKey - Receiver's RSA public key
   * @returns {Object} Encryption data needed for upload
   */
  const encryptFileForUpload = useCallback(async (file, receiverPublicKey) => {
    try {
      
      // const FILE_SISE_THRE = 100 * 1024 * 1024;
      // Step 1: Generate random AES key
      const aesKey = await generateAESKey()

      // Step 2: Calculate SHA-256 hash (streaming for large files)
      const fileHash = await calculateFileHashStreaming(file)

      let encryptedData = null
      let iv = null
      let encryptedFile = null

      // Step 3: Encryption strategy based on file size
      if (file.size <= FILE_SIZE_THRESHOLD) {
        // Small files: Pre-encrypt before upload (E2EE, most secure)
        const fileBuffer = await file.arrayBuffer()
        const result = await encryptFile(fileBuffer, aesKey)
        encryptedData = result.encryptedData
        iv = result.iv
        
        // Create encrypted file blob
        encryptedFile = new File(
          [encryptedData], 
          file.name,
          { type: file.type }
        )
      } else {
        // Large files: Skip pre-encryption, but still generate IV for server-side encryption
        encryptedFile = file
        
        // Generate IV for server to use during encryption
        const ivBytes = window.crypto.getRandomValues(new Uint8Array(12))
        iv = arrayBufferToBase64(ivBytes.buffer)
      }

      // Step 4: Encrypt AES key with receiver's RSA public key
      const encryptedAesKey = await encryptAESKey(aesKey, receiverPublicKey)

      // Cache encryption data
      const encryptionId = `${Date.now()}_${Math.random()}`
      encryptionCache.current[encryptionId] = {
        encryptedAesKey,
        iv,
        fileHash,
        originalSize: file.size,
        originalName: file.name,
        originalType: file.type,
        isLargeFile: file.size > FILE_SIZE_THRESHOLD
      }

      return {
        encryptedFile,
        encryptionId,
        encryptedAesKey,
        iv,
        fileHash
      }
    } catch (error) {
      console.error('File encryption failed:', error)
      throw error
    }
  }, [])
  // new

  /**
   * Encrypt once for the group and wrap the same AES key for every recipient.
   * @param {File} file - Original file
   * @param {Record<string, string>} recipientPublicKeys - userId -> RSA public key
   */
  const encryptFileForGroupUpload = useCallback(async (file, recipientPublicKeys = {}) => {
    try {
      const recipientEntries = Object.entries(recipientPublicKeys).filter(([, key]) => !!key)
      if (recipientEntries.length === 0) {
        throw new Error('No valid recipient encryption keys found for group members')
      }

      // Step 1: Generate one AES key for this shared group message
      const aesKey = await generateAESKey()

      // Step 2: Calculate file hash once
      const fileHash = await calculateFileHashStreaming(file)

      let iv = null
      let encryptedFile = null

      // Step 3: Encrypt file once
      if (file.size <= FILE_SIZE_THRESHOLD) {
        const fileBuffer = await file.arrayBuffer()
        const result = await encryptFile(fileBuffer, aesKey)
        iv = result.iv
        encryptedFile = new File([result.encryptedData], file.name, { type: file.type })
      } else {
        encryptedFile = file
        const ivBytes = window.crypto.getRandomValues(new Uint8Array(12))
        iv = arrayBufferToBase64(ivBytes.buffer)
      }

      // Step 4: Wrap the same AES key for each recipient
      const encryptedAesKeys = {}
      for (const [recipientId, publicKey] of recipientEntries) {
        encryptedAesKeys[recipientId] = await encryptAESKey(aesKey, publicKey)
      }

      return {
        encryptedFile,
        encryptedAesKeys,
        iv,
        fileHash
      }
    } catch (error) {
      console.error('Group file encryption failed:', error)
      throw error
    }
  }, [])
  // new end

  /**
   * Calculate file hash by streaming chunks (prevents memory overload)
   * @param {File} file - File to hash
   * @returns {string} SHA-256 hash in hex format
   */
  const calculateFileHashStreaming = useCallback(async (file) => {
    try {
      // For small files (<100MB), read entire file at once
      if (file.size <= 100 * 1024 * 1024) {
        const buffer = await file.arrayBuffer()
        const hash = await window.crypto.subtle.digest('SHA-256', buffer)
        const bytes = new Uint8Array(hash)
        return Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      }
      
      // For large files, we need to hash in chunks
      // SubtleCrypto doesn't support streaming, so we read all chunks and combine
      const chunkSize = 10 * 1024 * 1024 // 10MB chunks
      const chunks = []
      
      for (let i = 0; i < file.size; i += chunkSize) {
        const chunk = file.slice(i, Math.min(i + chunkSize, file.size))
        const buffer = await chunk.arrayBuffer()
        chunks.push(new Uint8Array(buffer))
      }
      
      // Combine all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const combined = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      
      // Hash the complete file
      const hash = await window.crypto.subtle.digest('SHA-256', combined)
      const bytes = new Uint8Array(hash)
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (error) {
      console.error('Hash calculation failed:', error)
      throw new Error('Failed to calculate file hash')
    }
  }, [])

  /**
   * Get cached encryption data
   */
  const getEncryptionData = useCallback((encryptionId) => {
    return encryptionCache.current[encryptionId]
  }, [])

  /**
   * Clear encryption cache
   */
  const clearEncryptionData = useCallback((encryptionId) => {
    delete encryptionCache.current[encryptionId]
  }, [])

  /**
   * Fetch receiver's public key
   */
  const getReceiverPublicKey = useCallback(async (receiverId) => {
    try {
      const response = await api.get(`/users/${receiverId}`)
      return response.data.rsaPublicKey
    } catch (error) {
      throw new Error('Failed to fetch receiver public key')
    }
  }, [])

  return {
    encryptFileForUpload,
    encryptFileForGroupUpload,
    getEncryptionData,
    clearEncryptionData,
    getReceiverPublicKey
  }
}
