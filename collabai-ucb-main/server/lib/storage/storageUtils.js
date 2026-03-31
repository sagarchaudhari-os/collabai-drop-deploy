import { getStorageProvider, getStorageType } from './storageFactory.js';
import mime from 'mime';
import path from 'path';

/**
 * Storage utility functions that work with both S3 and local storage
 */

/**
 * Upload an image to storage (supports both base64 and file path)
 * @param {string} imageData - Base64 string or file path
 * @param {string} type - 'base64' or 'image'
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} - Public/signed URL
 */
export const uploadImageToStorage = async (imageData, type, userId = null) => {
  const storage = getStorageProvider();
  
  let processedData = null;
  let contentType = 'image/png';
  let imageName = 'images/' + Date.now().toString() + ".png";

  try {
    if (type === 'base64') {
      // Remove base64 metadata and decode the string
      processedData = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    } else {
      // Read file from the given path
      const fs = await import('fs');
      processedData = fs.readFileSync(imageData);
      contentType = mime.getType(imageData) || 'image/png';

      const fileName = path.basename(imageData);
      imageName = 'images/' + Date.now().toString() + '-' + fileName;
    }

    // Add user ID to path if provided
    if (userId) {
      imageName = `images/${userId}/${Date.now().toString()}_${path.basename(imageName)}`;
    }

    const url = await storage.upload(imageName, processedData, contentType);
    return url;
  } catch (err) {
    console.error('Error uploading image to storage:', err);
    return null;
  }
};

/**
 * Upload a file to storage
 * @param {string} name - File name
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} contentType - MIME type
 * @param {string} userId - User ID
 * @param {string} category - File category (e.g., 'knowledgeBase', 'images')
 * @returns {Promise<string>} - Public/signed URL
 */
export const uploadToStorage = async (name, fileBuffer, contentType, userId, category = 'knowledgeBase') => {
  const storage = getStorageProvider();
  
  try {
    const allowedFileExtensions = [
      'c', 'cpp', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 
      'pptx', 'py', 'rb', 'tex', 'txt', 'csv', 'css', 'jpeg', 'jpg', 
      'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'
    ];

    const fileExtension = path.extname(name).toLowerCase().substring(1);
    if (!allowedFileExtensions.includes(fileExtension)) {
      throw new Error(`File type .${fileExtension} is not allowed`);
    }

    const storageKey = userId ? `${category}/${userId}/${name}` : `${category}/${name}`;
    const url = await storage.upload(storageKey, fileBuffer, contentType);
    
    return url;
  } catch (err) {
    console.error('Error uploading file to storage:', err);
    return null;
  }
};

/**
 * Download a file from storage
 * @param {string} key - Storage key/path
 * @returns {Promise<Buffer>} - File data
 */
export const downloadFromStorage = async (key) => {
  const storage = getStorageProvider();
  
  try {
    const data = await storage.download(key);
    return data;
  } catch (err) {
    console.error('Error downloading file from storage:', err);
    throw err;
  }
};

/**
 * Delete a file from storage
 * @param {string} key - Storage key/path
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromStorage = async (key) => {
  const storage = getStorageProvider();
  
  try {
    const success = await storage.delete(key);
    return success;
  } catch (err) {
    console.error('Error deleting file from storage:', err);
    return false;
  }
};

/**
 * Delete multiple files from storage
 * @param {string[]} keys - Array of storage keys/paths
 * @returns {Promise<boolean>} - Success status
 */
export const deleteMultipleFromStorage = async (keys) => {
  const storage = getStorageProvider();
  
  try {
    const success = await storage.deleteMultiple(keys);
    return success;
  } catch (err) {
    console.error('Error deleting multiple files from storage:', err);
    return false;
  }
};

/**
 * Get signed URL for a file
 * @param {string} key - Storage key/path
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string>} - Signed URL
 */
export const getSignedUrlFromStorage = async (key, expiresIn = 3600) => {
  const storage = getStorageProvider();
  
  try {
    const url = await storage.getSignedUrl(key, expiresIn);
    return url;
  } catch (err) {
    console.error('Error getting signed URL from storage:', err);
    return null;
  }
};

/**
 * Check if file exists in storage
 * @param {string} key - Storage key/path
 * @returns {Promise<boolean>} - File existence
 */
export const fileExistsInStorage = async (key) => {
  const storage = getStorageProvider();
  
  try {
    const exists = await storage.exists(key);
    return exists;
  } catch (err) {
    console.error('Error checking file existence in storage:', err);
    return false;
  }
};

/**
 * List files with a prefix
 * @param {string} prefix - File prefix
 * @returns {Promise<string[]>} - Array of file keys
 */
export const listFilesInStorage = async (prefix) => {
  const storage = getStorageProvider();
  
  try {
    const files = await storage.list(prefix);
    return files;
  } catch (err) {
    console.error('Error listing files in storage:', err);
    return [];
  }
};

/**
 * Get storage info
 * @returns {Object} - Storage information
 */
export const getStorageInfo = () => {
  return {
    type: getStorageType(),
    provider: getStorageType() === 's3' ? 'Amazon S3' : 'Local Storage'
  };
};
