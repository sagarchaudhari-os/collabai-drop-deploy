# Quick Start Guide: S3 Fallback to Local Storage

## 🚀 Quick Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Storage Configuration (Optional)
STORAGE_TYPE=auto          # 's3', 'local', or 'auto' (default: auto)
LOCAL_STORAGE_PATH=./uploads  # Local storage directory

# AWS S3 Configuration (Optional - will fallback to local if missing)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_KEY_ID=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
```

### 2. Test the Implementation

```bash
# Test current storage configuration
node server/utils/storageTest.js

# Force local storage test
STORAGE_TYPE=local node server/utils/storageTest.js
```

## 📋 Configuration Options

### Option 1: Auto-Detection (Recommended)
```bash
STORAGE_TYPE=auto
# Will use S3 if credentials are available, otherwise local storage
```

### Option 2: Force S3 (Production)
```bash
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_KEY_ID=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket
```

### Option 3: Force Local Storage (Development)
```bash
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```

## 🔧 Usage

### Existing Code (No Changes Required)

Your existing code will work without any changes:

```javascript
// These functions now work with both S3 and local storage
import { uploadImageToS3, uploadToS3Bucket } from '../lib/s3.js';

// Upload image
const imageUrl = await uploadImageToS3(imageData, 'base64');

// Upload file
const fileUrl = await uploadToS3Bucket(filename, fileBuffer, contentType, userId);
```

### New Utility Functions

```javascript
// Use the new storage utilities for better abstraction
import { uploadImageToStorage, uploadToStorage } from '../lib/storage/storageUtils.js';

// Upload image with user ID
const imageUrl = await uploadImageToStorage(imageData, 'base64', userId);

// Upload file to specific category
const fileUrl = await uploadToStorage(filename, fileBuffer, contentType, userId, 'knowledgeBase');
```

## 📁 File Organization

### Local Storage Structure
```
uploads/
├── images/
│   ├── user1/
│   │   ├── 1234567890_avatar.jpg
│   │   └── 1234567891_profile.png
│   └── user2/
│       └── 1234567892_image.jpg
├── knowledgeBase/
│   ├── user1/
│   │   ├── document1.pdf
│   │   └── document2.docx
│   └── user2/
│       └── document3.txt
└── ...
```

### URL Formats

**S3 URLs:**
```
https://bucket.s3.region.amazonaws.com/images/user1/1234567890_avatar.jpg?X-Amz-Algorithm=...
```

**Local Storage URLs:**
```
http://localhost:8002/uploads/images/user1/1234567890_avatar.jpg
```

## 🧪 Testing Scenarios

### Test 1: With S3 Credentials
```bash
# Set S3 credentials
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_KEY_ID=your_secret
export AWS_BUCKET_NAME=your_bucket

# Should use S3 storage
node server/utils/storageTest.js
```

### Test 2: Without S3 Credentials
```bash
# Remove S3 credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_KEY_ID
unset AWS_BUCKET_NAME

# Should fallback to local storage
node server/utils/storageTest.js
```

### Test 3: Force Local Storage
```bash
# Force local storage regardless of S3 credentials
export STORAGE_TYPE=local
node server/utils/storageTest.js
```

## 🔍 Troubleshooting

### Issue: "Storage provider not found"
**Solution:** Check your environment variables and file permissions

### Issue: "File upload failed"
**Solution:** 
- For local storage: Check disk space and directory permissions
- For S3: Verify credentials and bucket permissions

### Issue: "File not accessible"
**Solution:** 
- Check static file serving is enabled in `app.js`
- Verify file paths and permissions

## 📊 Monitoring

### Check Storage Type
```javascript
import { getStorageType, getStorageInfo } from '../lib/storage/storageFactory.js';

console.log('Storage Type:', getStorageType());
console.log('Storage Info:', getStorageInfo());
```

### Log Storage Operations
The implementation automatically logs storage operations:
```
Using S3 storage provider (auto-detected)
Using local storage provider (auto-detected)
File upload successful: http://localhost:8002/uploads/images/test.jpg
```

## 🚀 Production Deployment

### Recommended Production Setup
```bash
# Use S3 for production
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_production_key
AWS_SECRET_KEY_ID=your_production_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_production_bucket
```

### Development Setup
```bash
# Use local storage for development
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```

## 📚 Additional Resources

- **Full Documentation**: [STORAGE_IMPLEMENTATION.md](./STORAGE_IMPLEMENTATION.md)
- **API Reference**: Check the storage utility functions in `server/lib/storage/storageUtils.js`
- **Testing**: Use `server/utils/storageTest.js` for comprehensive testing

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Run the storage test utility
3. Check the server logs for error messages
4. Verify your environment configuration

The implementation is designed to be robust and provide clear error messages to help with debugging.
