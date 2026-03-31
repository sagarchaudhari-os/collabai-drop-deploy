/**
 * Storage Test Utility
 * This utility helps test both S3 and local storage implementations
 */
import { getStorageProvider, getStorageType, hasS3Credentials } from '../lib/storage/storageFactory.js';
import { uploadImageToStorage, uploadToStorage, downloadFromStorage, deleteFromStorage } from '../lib/storage/storageUtils.js';
import fs from 'fs';

export const testStorageProvider = async () => {
  console.log('=== Storage Provider Test ===');
  
  // Test 1: Check storage type
  const storageType = getStorageType();
  const hasS3 = hasS3Credentials();
  console.log(`Storage Type: ${storageType}`);
  console.log(`S3 Credentials Available: ${hasS3}`);
  
  // Test 2: Get storage provider
  try {
    const storage = getStorageProvider();
    console.log(`Storage Provider: ${storage.constructor.name}`);
  } catch (error) {
    console.error('Error getting storage provider:', error.message);
    return false;
  }
  
  // Test 3: Test image upload
  try {
    console.log('\n--- Testing Image Upload ---');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const imageUrl = await uploadImageToStorage(testImageData, 'base64', 'test-user');
    
    if (imageUrl) {
      console.log(`✅ Image upload successful: ${imageUrl}`);
      
      // Test 4: Test file download
      console.log('\n--- Testing File Download ---');
      const key = imageUrl.includes('uploads/') ? imageUrl.split('uploads/')[1] : 'images/test-user/test-image.png';
      const downloadedData = await downloadFromStorage(key);
      
      if (downloadedData && downloadedData.length > 0) {
        console.log(`✅ File download successful: ${downloadedData.length} bytes`);
        
        // Test 5: Test file deletion
        console.log('\n--- Testing File Deletion ---');
        const deleteSuccess = await deleteFromStorage(key);
        
        if (deleteSuccess) {
          console.log(`✅ File deletion successful`);
        } else {
          console.log(`❌ File deletion failed`);
        }
      } else {
        console.log(`❌ File download failed`);
      }
    } else {
      console.log(`❌ Image upload failed`);
    }
  } catch (error) {
    console.error('Error during storage test:', error.message);
    return false;
  }
  
  // Test 6: Test knowledge base file upload
  try {
    console.log('\n--- Testing Knowledge Base Upload ---');
    const testContent = 'This is a test knowledge base file content.';
    const testBuffer = Buffer.from(testContent, 'utf8');
    const fileUrl = await uploadToStorage('test-file.txt', testBuffer, 'text/plain', 'test-user', 'knowledgeBase');
    
    if (fileUrl) {
      console.log(`✅ Knowledge base upload successful: ${fileUrl}`);
    } else {
      console.log(`❌ Knowledge base upload failed`);
    }
  } catch (error) {
    console.error('Error during knowledge base test:', error.message);
  }
  
  console.log('\n=== Storage Test Complete ===');
  return true;
};

export const testLocalStorageOnly = async () => {
  console.log('=== Local Storage Only Test ===');
  
  // Temporarily override storage type to local
  const originalEnv = process.env.STORAGE_TYPE;
  process.env.STORAGE_TYPE = 'local';
  
  try {
    // Reset storage provider to force recreation
    const { StorageFactory } = await import('../lib/storage/storageFactory.js');
    StorageFactory.resetStorageProvider();
    
    await testStorageProvider();
  } catch (error) {
    console.error('Error during local storage test:', error);
  } finally {
    // Restore original environment
    if (originalEnv) {
      process.env.STORAGE_TYPE = originalEnv;
    } else {
      delete process.env.STORAGE_TYPE;
    }
    
    // Reset storage provider again
    const { StorageFactory } = await import('../lib/storage/storageFactory.js');
    StorageFactory.resetStorageProvider();
  }
};

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testStorageProvider().then(() => {
    console.log('Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}
