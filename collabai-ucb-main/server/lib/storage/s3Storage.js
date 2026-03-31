import AWS from "aws-sdk";
import config from "../../config.js";

export class S3Storage {
  constructor() {
    this.bucketName = config.AWS_BUCKET_NAME;
    this.bucketExpireTime = config.AWS_BUCKET_EXPIRE_TIME || 31536000; // 1 year default
    
    AWS.config.update({
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_KEY_ID,
      region: config.AWS_REGION,
    });
    
    this.s3 = new AWS.S3();
  }

  /**
   * Upload a file to S3
   * @param {string} key - File path/key
   * @param {Buffer} buffer - File data
   * @param {string} contentType - MIME type
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Signed URL
   */
  async upload(key, buffer, contentType, options = {}) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ...options
      };

      const uploadResult = await this.s3.upload(params).promise();
      
      // Generate signed URL
      const urlParams = {
        Bucket: this.bucketName,
        Key: key,
        Expires: this.bucketExpireTime,
      };

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', urlParams);
      return signedUrl;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Download a file from S3
   * @param {string} key - File path/key
   * @returns {Promise<Buffer>} - File data
   */
  async download(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      };

      const data = await this.s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple files from S3
   * @param {string[]} keys - Array of file paths/keys
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMultiple(keys) {
    try {
      if (keys.length === 0) return true;

      // Delete objects in batches of up to 1000 (S3 limit)
      const deleteChunks = [];
      for (let i = 0; i < keys.length; i += 1000) {
        deleteChunks.push(keys.slice(i, i + 1000));
      }

      for (const chunk of deleteChunks) {
        const deleteParams = {
          Bucket: this.bucketName,
          Delete: { 
            Objects: chunk.map(key => ({ Key: key }))
          }
        };
        
        await this.s3.deleteObjects(deleteParams).promise();
      }

      return true;
    } catch (error) {
      console.error('S3 delete multiple error:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for a file
   * @param {string} key - File path/key
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      };

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', params);
      return signedUrl;
    } catch (error) {
      console.error('S3 getSignedUrl error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} - File existence
   */
  async exists(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      console.error('S3 exists check error:', error);
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
      const params = {
        Bucket: this.bucketName,
        Prefix: prefix,
      };

      const data = await this.s3.listObjectsV2(params).promise();
      return data.Contents ? data.Contents.map(obj => obj.Key) : [];
    } catch (error) {
      console.error('S3 list error:', error);
      return [];
    }
  }
}
