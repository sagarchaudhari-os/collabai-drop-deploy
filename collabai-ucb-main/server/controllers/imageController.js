import AWS from "aws-sdk"
import multer from "multer"
import multerS3 from "multer-s3"
import StatusCodes from "http-status-codes";
import imageModel from "../models/imageModel.js"
import { ImageMessages } from "../constants/enums.js";
import config from "../config.js";
import { getStorageProvider, getStorageType } from "../lib/storage/storageFactory.js";


AWS.config.update({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_KEY_ID,
  region: config.AWS_REGION,
});

const bucketName = config.AWS_BUCKET_NAME;
const bucketExpireTime = config.AWS_BUCKET_EXPIRE_TIME;

const s3 = new AWS.S3();

// Multer middleware to handle the file upload
// Only use multer-s3 if S3 is available, otherwise use regular multer
const storageType = getStorageType();
export const uploadS3 = storageType === 's3' 
  ? multer({
      storage: multerS3({
        s3: s3,
        bucket: bucketName,
        // acl: 'public-read',
        contentType:multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, 'images/' + Date.now().toString() + '_' + file.originalname);
        },
      }),
      limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    })
  : multer({
      dest: 'uploads/images/',
      limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    });


/**
 * @function uploadImage
 * @description Handles image upload, generates a signed URL for the uploaded image from S3, and returns the URL.
 * @param {Object} req - Request object; expects file in `req.file`.
 * @param {Object} res - Responds with signed image URL or error message.
 * @returns {Response}
 *  - 200: Success with signed image URL.
 *  - 400: No file provided.
 *  - 500: Error generating signed URL or unexpected error.
 */

// Function to handle image upload
export const uploadImage = async (req, res) => {   
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No file provided' });
    }

    const storage = getStorageProvider();
    let imageUrl;

    if (storageType === 's3') {
      // S3 flow - use existing logic
      const params = {
        Bucket: bucketName,
        Key: req.file.key,
        Expires: bucketExpireTime,
      };

      s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          console.error('Error generating signed URL:', err);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: ImageMessages.CANNOT_GENERATE_URL });
        }
        const image = new imageModel({
          imageurl: url,
        });

        res.status(200).json({ imageUrl: url });
      });
    } else {
      // Local storage flow
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName = Date.now().toString() + '_' + req.file.originalname;
      const key = `images/${fileName}`;
      
      imageUrl = await storage.upload(key, fileBuffer, req.file.mimetype);
      
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      
      const image = new imageModel({
        imageurl: imageUrl,
      });

      res.status(200).json({ imageUrl: imageUrl });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Unexpected error' });
  }
};
