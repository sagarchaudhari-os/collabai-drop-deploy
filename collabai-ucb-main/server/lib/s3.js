import fs from 'fs';
// import mime from "mime-types";
import mime from "mime";
import path from 'path';
import config from "../config.js";
import AWS from "aws-sdk";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSignedUrl } from '../service/fluxImageGeneratorService.js';
import { 
  uploadImageToStorage, 
  uploadToStorage, 
  downloadFromStorage,
  deleteFromStorage,
  deleteMultipleFromStorage,
  getSignedUrlFromStorage
} from './storage/storageUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurations
const bucketName = config.AWS_BUCKET_NAME;
const bucketExpireTime = config.AWS_BUCKET_EXPIRE_TIME; // Not used in the code
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY_ID,
  region: config.AWS_REGION,
});
const s3 = new AWS.S3();

// Function to handle image upload using base64 or file path
export const uploadImageToS3 = async (imageData, type, userId = null) => {
  // Use the new storage abstraction
  return await uploadImageToStorage(imageData, type, userId);
};

// Function to handle image upload using base64 or file path
export const uploadToS3Bucket = async (name, fileBuffer, type, userId) => {
  // Use the new storage abstraction
  return await uploadToStorage(name, fileBuffer, type, userId, 'knowledgeBase');
};

export const deleteSingleFileFromS3Bucket = async (Prefix, key) => {
  // Use the new storage abstraction
  const success = await deleteFromStorage(key);
  return success ? 200 : 500;
}


export const deleteSingleUsersAllFileFromS3Bucket = async (key) => {
  // Use the new storage abstraction
  const success = await deleteFromStorage(key);
  return success ? 200 : 500;
}

export const deleteAllFilesFromS3Bucket = async (Prefix) => {
  // Use the new storage abstraction
  return await deleteMultipleFromStorage([Prefix]);
}




// Function to ensure that a directory path exists
export const ensureDirectoryExistence = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
  }
}

export const downloadFileFromS3 = async (userId, fileName) => {
  const s3Key = `knowledgeBase/${userId}/${fileName}`;
  
  try {
    // Use the new storage abstraction to download
    const fileBuffer = await downloadFromStorage(s3Key);

    const directoryPath = path.join(__dirname, '../docs', 'downloads');
    const filePath = path.join(directoryPath, fileName);
    ensureDirectoryExistence(filePath);
    
    // Ensure the directory exists
    fs.mkdirSync(directoryPath, { recursive: true });

    // Write the buffer to file
    fs.writeFileSync(filePath, fileBuffer);
    console.log('File download finished successfully:', filePath);

    return filePath;
  } catch (error) {
    console.error("Error downloading file from storage:", error);
    return '';
  }
};
