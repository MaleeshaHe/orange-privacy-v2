/**
 * Encryption Service
 * Provides AES-256-GCM encryption for sensitive data like OAuth tokens
 *
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Unique IV (Initialization Vector) for each encryption
 * - Authentication tag to prevent tampering
 * - Base64 encoding for database storage
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Encryption algorithm
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // 128 bits for GCM
    this.authTagLength = 16; // 128 bits authentication tag
    this.saltLength = 64; // Salt for key derivation

    // Get encryption key from environment
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * Get or derive encryption key from environment variable
   * Uses PBKDF2 to derive a proper 256-bit key from the passphrase
   */
  getEncryptionKey() {
    const passphrase = process.env.ENCRYPTION_KEY;

    if (!passphrase) {
      throw new Error('ENCRYPTION_KEY environment variable is required for OAuth token encryption');
    }

    if (process.env.NODE_ENV === 'production' && passphrase.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters in production');
    }

    // Derive a proper 256-bit key using PBKDF2
    // In production, you should use a fixed salt stored securely
    // For simplicity, we're using a static salt here (should be unique per installation)
    const salt = process.env.ENCRYPTION_SALT || 'orangeprivacy-default-salt-change-in-production';

    return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt a string value
   *
   * @param {string} plaintext - The text to encrypt
   * @returns {string} - Encrypted text in format: iv:authTag:encryptedData (base64 encoded)
   */
  encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    try {
      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      // Format: iv:authTag:encryptedData (all base64 encoded)
      const result = [
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted
      ].join(':');

      return result;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   *
   * @param {string} encryptedData - Encrypted text in format: iv:authTag:encryptedData
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    try {
      // Split the encrypted data
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, encrypted] = parts;

      // Decode from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Validate lengths
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== this.authTagLength) {
        throw new Error('Invalid auth tag length');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if a string appears to be encrypted
   * (Simple format check: contains 2 colons and is base64)
   *
   * @param {string} value - Value to check
   * @returns {boolean} - True if appears encrypted
   */
  isEncrypted(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const parts = value.split(':');
    if (parts.length !== 3) {
      return false;
    }

    // Check if all parts are valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return parts.every(part => base64Regex.test(part));
  }

  /**
   * Hash a value (one-way, for comparison purposes)
   * Useful for storing hashed tokens for revocation checks
   *
   * @param {string} value - Value to hash
   * @returns {string} - SHA-256 hash (hex encoded)
   */
  hash(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('Value must be a non-empty string');
    }

    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Generate a random token
   * Useful for generating secure random values
   *
   * @param {number} length - Length in bytes (default: 32)
   * @returns {string} - Random token (hex encoded)
   */
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Export singleton instance
module.exports = new EncryptionService();
