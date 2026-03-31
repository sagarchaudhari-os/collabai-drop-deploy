import { S3Storage } from './s3Storage.js';
import { LocalStorage } from './localStorage.js';
import config from '../../config.js';

/**
 * Storage Factory - Creates appropriate storage provider based on configuration
 */
export class StorageFactory {
  static instance = null;
  static storageProvider = null;

  /**
   * Get singleton instance of storage provider
   * @returns {Object} Storage provider instance
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new StorageFactory();
    }
    return this.instance;
  }

  /**
   * Get storage provider (S3 or Local)
   * @returns {Object} Storage provider instance
   */
  static getStorageProvider() {
    if (!this.storageProvider) {
      this.storageProvider = this.createStorageProvider();
    }
    return this.storageProvider;
  }

  /**
   * Create appropriate storage provider based on configuration
   * @returns {Object} Storage provider instance
   */
  static createStorageProvider() {
    const storageType = config.STORAGE_TYPE || 'auto';
    const hasS3Credentials = this.hasS3Credentials();
    
    // Manual configuration takes precedence
    if (storageType === 's3') {
      if (!hasS3Credentials) {
        throw new Error('S3 storage type configured but S3 credentials are missing');
      }
      console.log('Using S3 storage provider (manually configured)');
      return new S3Storage();
    } else if (storageType === 'local') {
      console.log('Using local storage provider (manually configured)');
      return new LocalStorage();
    } else {
      // Auto mode - detect based on credentials
      if (hasS3Credentials) {
        console.log('Using S3 storage provider (auto-detected)');
        return new S3Storage();
      } else {
        console.log('S3 credentials not found, using local storage provider (auto-detected)');
        return new LocalStorage();
      }
    }
  }

  /**
   * Check if S3 credentials are available
   * @returns {boolean} True if S3 credentials are available
   */
  static hasS3Credentials() {
    const requiredCredentials = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_KEY_ID', 
      'AWS_REGION',
      'AWS_BUCKET_NAME'
    ];

    return requiredCredentials.every(cred => {
      const value = config[cred];
      return value && value.trim() !== '' && value !== 'test-bucket';
    });
  }

  /**
   * Reset storage provider (useful for testing or config changes)
   */
  static resetStorageProvider() {
    this.storageProvider = null;
    this.instance = null;
  }

  /**
   * Get storage provider type
   * @returns {string} 's3' or 'local'
   */
  static getStorageType() {
    return this.hasS3Credentials() ? 's3' : 'local';
  }
}

// Export convenience functions
export const getStorageProvider = () => StorageFactory.getStorageProvider();
export const getStorageType = () => StorageFactory.getStorageType();
export const hasS3Credentials = () => StorageFactory.hasS3Credentials();
