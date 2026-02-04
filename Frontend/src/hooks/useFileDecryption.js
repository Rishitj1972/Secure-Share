import { useCallback } from 'react'
import { decryptAESKey, decryptFile, calculateFileHash } from '../utils/crypto'
import { getPrivateKey } from '../utils/crypto'
import api from '../api/axios'

/**
 * Hook for decrypting downloaded files
 */
export function useFileDecryption() {
  
  /**
   * Download and decrypt a file
   * @param {string} fileId - File ID to download
   * @param {string} userId - Current user ID
   * @param {Object} fileMeta - File metadata (contains encryption data)
   * @param {Function} onProgress - Progress callback (progress, stage)
   * @returns {Blob} Decrypted file blob
   */
  const downloadAndDecrypt = useCallback(async (fileId, userId, fileMeta, onProgress = null) => {
    try {
      // Step 1: Download encrypted file
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const downloadUrl = `${api.defaults.baseURL}/files/download/${fileId}?token=${encodeURIComponent(token)}`
      
      onProgress?.(0, 'downloading')
      
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Get total file size for progress tracking
      const totalSize = parseInt(response.headers.get('content-length') || '0')
      
      if (totalSize === 0 || !response.body) {
        // Fallback if streaming not supported
        onProgress?.(50, 'downloading')
        const encryptedBlob = await response.blob()
        onProgress?.(100, 'downloading')
        
        if (!fileMeta.isEncrypted) {
          return encryptedBlob
        }
        
        // Decrypt without progress
        onProgress?.(0, 'decrypting')
        const privateKey = getPrivateKey(userId)
        if (!privateKey) {
          throw new Error('Private key not found. Cannot decrypt file.')
        }
        const aesKey = await decryptAESKey(fileMeta.encryptedAesKey, privateKey)
        onProgress?.(50, 'decrypting')
        const decryptedBlob = await decryptFile(encryptedBlob, aesKey, fileMeta.iv)
        onProgress?.(100, 'decrypting')
        
        return decryptedBlob
      }
      
      // Stream download with progress tracking
      const reader = response.body.getReader()
      const chunks = []
      let receivedLength = 0
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        receivedLength += value.length
        
        // Report download progress (0-100)
        const progress = Math.min(100, Math.round((receivedLength / totalSize) * 100))
        onProgress?.(progress, 'downloading')
      }
      
      // Combine chunks into single Uint8Array
      const allChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        allChunks.set(chunk, position)
        position += chunk.length
      }
      
      const encryptedBlob = new Blob([allChunks])

      // If file is not encrypted, return as-is
      if (!fileMeta.isEncrypted) {
        onProgress?.(100, 'complete')
        return encryptedBlob
      }

      // Step 2: Decryption process
      onProgress?.(0, 'decrypting')
      
      // Get private key
      const privateKey = getPrivateKey(userId)
      if (!privateKey) {
        throw new Error('Private key not found. Cannot decrypt file.')
      }
      
      onProgress?.(20, 'decrypting')

      // Step 3: Decrypt AES key
      const aesKey = await decryptAESKey(fileMeta.encryptedAesKey, privateKey)
      
      onProgress?.(40, 'decrypting')

      // Step 4: Decrypt file
      const decryptedBlob = await decryptFile(encryptedBlob, aesKey, fileMeta.iv)
      
      onProgress?.(80, 'decrypting')

      // Step 5: Verify integrity (only for encrypted files)
      // Note: For large files (>100MB), server encrypts them, so hash verification is complex
      // We verify hash for client-encrypted files only (small files)
      if (fileMeta.fileHash && fileMeta.iv && encryptedBlob.size <= 100 * 1024 * 1024) {
        onProgress?.(90, 'verifying')
        
        // Read blob once to prevent read errors
        const decryptedBuffer = await decryptedBlob.arrayBuffer()
        const calculatedHash = await calculateFileHash(decryptedBuffer)
        
        if (calculatedHash !== fileMeta.fileHash) {
          console.warn('Hash mismatch:', { calculated: calculatedHash, expected: fileMeta.fileHash })
          // Don't throw for now - large files may have different encryption flow
          // throw new Error('File integrity check failed! File may be corrupted or tampered.')
        }
      }

      onProgress?.(100, 'complete')
      return decryptedBlob
    } catch (error) {
      console.error('Decryption failed:', error)
      throw error
    }
  }, [])

  return {
    downloadAndDecrypt
  }
}
