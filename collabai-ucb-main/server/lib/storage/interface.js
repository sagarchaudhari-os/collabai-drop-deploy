/**
 * Storage Interface - Defines the contract for all storage providers
 */
export class StorageInterface {
  /**
   * Upload a file to storage
   * @param {string} key - File path/key
   * @param {Buffer} buffer - File data
   * @param {string} contentType - MIME type
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL or signed URL
   */
  async upload(key, buffer, contentType, options = {}) {
    throw new Error('upload method must be implemented');
  }

  /**
   * Download a file from storage
   * @param {string} key - File path/key
   * @returns {Promise<Buffer>} - File data
   */
  async download(key) {
    throw new Error('download method must be implemented');
  }

  /**
   * Delete a file from storage
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Delete multiple files from storage
   * @param {string[]} keys - Array of file paths/keys
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMultiple(keys) {
    throw new Error('deleteMultiple method must be implemented');
  }

  /**
   * Get a signed URL for a file
   * @param {string} key - File path/key
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    throw new Error('getSignedUrl method must be implemented');
  }

  /**
   * Check if file exists
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - File existence
   */
  async exists(key) {
    throw new Error('exists method must be implemented');
  }

  /**
   * List files with a prefix
   * @param {string} prefix - File prefix
   * @returns {Promise<string[]>} - Array of file keys
   */
  async list(prefix) {
    throw new Error('list method must be implemented');
  }
}
