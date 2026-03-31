import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LocalStorage {
  constructor() {
    this.basePath = path.join(__dirname, '../../uploads');
    this.publicUrl = config.LOCAL_STORAGE_BASE_URL || 'http://localhost:8001';
    this.ensureBaseDirectory();
  }

  /**
   * Ensure base directory exists
   */
  ensureBaseDirectory() {
    if (!fsSync.existsSync(this.basePath)) {
      fsSync.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Ensure directory exists for a given path
   * @param {string} filePath - File path
   */
  async ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Upload a file to local storage
   * @param {string} key - File path/key
   * @param {Buffer} buffer - File data
   * @param {string} contentType - MIME type
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL
   */
  async upload(key, buffer, contentType, options = {}) {
    try {
      const fullPath = path.join(this.basePath, key);
      await this.ensureDirectoryExists(fullPath);
      
      await fs.writeFile(fullPath, buffer);
      
      // Return public URL
      const publicKey = key.replace(/\\/g, '/'); // Ensure forward slashes for URLs
      return `${this.publicUrl}/uploads/${publicKey}`;
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file from local storage
   * @param {string} key - File path/key
   * @returns {Promise<Buffer>} - File data
   */
  async download(key) {
    try {
      const fullPath = path.join(this.basePath, key);
      const data = await fs.readFile(fullPath);
      return data;
    } catch (error) {
      console.error('Local storage download error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete a file from local storage
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    try {
      const fullPath = path.join(this.basePath, key);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Local storage delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple files from local storage
   * @param {string[]} keys - Array of file paths/keys
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMultiple(keys) {
    try {
      const deletePromises = keys.map(key => this.delete(key));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Local storage delete multiple error:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for a file (for local storage, just return public URL)
   * @param {string} key - File path/key
   * @param {number} expiresIn - Expiration time in seconds (ignored for local storage)
   * @returns {Promise<string>} - Public URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    const publicKey = key.replace(/\\/g, '/');
    return `${this.publicUrl}/uploads/${publicKey}`;
  }

  /**
   * Check if file exists
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - File existence
   */
  async exists(key) {
    try {
      const fullPath = path.join(this.basePath, key);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files with a prefix
   * @param {string} prefix - File prefix
   * @returns {Promise<string[]>} - Array of file keys
   */
  async list(prefix) {
    try {
      const fullPath = path.join(this.basePath, prefix);
      const files = [];
      
      const readDir = async (dir, currentPrefix = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullEntryPath = path.join(dir, entry.name);
          const relativePath = path.join(currentPrefix, entry.name).replace(/\\/g, '/');
          
          if (entry.isDirectory()) {
            await readDir(fullEntryPath, relativePath);
          } else {
            files.push(relativePath);
          }
        }
      };
      
      if (fsSync.existsSync(fullPath)) {
        await readDir(fullPath, prefix);
      }
      
      return files;
    } catch (error) {
      console.error('Local storage list error:', error);
      return [];
    }
  }

  /**
   * Get file stats
   * @param {string} key - File path/key
   * @returns {Promise<Object>} - File stats
   */
  async getStats(key) {
    try {
      const fullPath = path.join(this.basePath, key);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error('Local storage getStats error:', error);
      return null;
    }
  }
}
