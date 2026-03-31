# Storage Implementation: S3 Fallback to Local Storage

## Overview

This implementation provides a seamless fallback mechanism from AWS S3 to local storage when S3 credentials are missing or unavailable. The system automatically detects the available storage option and uses the appropriate provider.

## Architecture

### Storage Abstraction Layer

The implementation uses a factory pattern with the following components:

1. **StorageInterface** (`server/lib/storage/interface.js`) - Abstract interface defining storage operations
2. **S3Storage** (`server/lib/storage/s3Storage.js`) - AWS S3 implementation
3. **LocalStorage** (`server/lib/storage/localStorage.js`) - Local file system implementation
4. **StorageFactory** (`server/lib/storage/storageFactory.js`) - Factory for creating appropriate storage provider
5. **StorageUtils** (`server/lib/storage/storageUtils.js`) - Utility functions for common operations

## Configuration

### Environment Variables

```bash
# Storage Configuration
STORAGE_TYPE=auto          # Options: 's3', 'local', or 'auto' (default: auto)
LOCAL_STORAGE_PATH=./uploads  # Local storage directory

# AWS S3 Configuration (Optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_KEY_ID=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
AWS_BUCKET_EXPIRE_TIME=31536000
```

### Storage Type Modes

- **`auto`** (default): Automatically detects available storage
  - Uses S3 if credentials are present and valid
  - Falls back to local storage if S3 credentials are missing
- **`s3`**: Force S3 usage (requires valid credentials)
- **`local`**: Force local storage usage

## File Structure

```
server/
├── lib/
│   └── storage/
│       ├── interface.js          # Storage interface
│       ├── s3Storage.js          # S3 implementation
│       ├── localStorage.js       # Local storage implementation
│       ├── storageFactory.js     # Storage factory
│       └── storageUtils.js       # Utility functions
├── routes/
│   └── staticFiles.js           # Static file serving for local storage
├── utils/
│   └── storageTest.js           # Storage testing utility
└── uploads/                     # Local storage directory (auto-created)
    ├── images/
    ├── knowledgeBase/
    └── ...
```

## Usage Examples

### Basic File Upload

```javascript
import { uploadImageToStorage } from '../lib/storage/storageUtils.js';

// Upload image (works with both S3 and local storage)
const imageUrl = await uploadImageToStorage(base64Data, 'base64', userId);
```

### Knowledge Base File Upload

```javascript
import { uploadToStorage } from '../lib/storage/storageUtils.js';

// Upload file to knowledge base
const fileUrl = await uploadToStorage(filename, fileBuffer, contentType, userId, 'knowledgeBase');
```

### File Download

```javascript
import { downloadFromStorage } from '../lib/storage/storageUtils.js';

// Download file
const fileData = await downloadFromStorage(storageKey);
```

### File Deletion

```javascript
import { deleteFromStorage } from '../lib/storage/storageUtils.js';

// Delete single file
const success = await deleteFromStorage(storageKey);

// Delete multiple files
const success = await deleteMultipleFromStorage([key1, key2, key3]);
```

## URL Formats

### S3 URLs
- **Signed URLs**: `https://bucket.s3.region.amazonaws.com/path/to/file?X-Amz-Algorithm=...`
- **Public URLs**: `https://bucket.s3.region.amazonaws.com/path/to/file`

### Local Storage URLs
- **Public URLs**: `http://localhost:8002/uploads/path/to/file`

## Client-Side Handling

The client automatically handles both URL types:

```javascript
// Client-side download function handles both S3 and local URLs
export const handleDownloadS3Image = async (imageUrl) => {
  // Automatically detects S3 vs local URLs and handles accordingly
  if (imageUrl.includes('s3.amazonaws.com')) {
    // S3 URL handling
  } else if (imageUrl.includes('/uploads/')) {
    // Local storage URL handling
  }
};
```

## Static File Serving

When using local storage, files are served through Express static middleware:

```javascript
// Route: GET /uploads/*
app.use('/', staticFilesRouter);
```

## Migration from Existing S3 Implementation

### Backward Compatibility

All existing S3 function calls remain unchanged:

```javascript
// These functions now work with both S3 and local storage
import { uploadImageToS3, uploadToS3Bucket, downloadFileFromS3 } from '../lib/s3.js';

// Usage remains the same
const url = await uploadImageToS3(imageData, 'base64');
```

### Updated Controllers

The following controllers have been updated to use the storage abstraction:

- `imageController.js` - Image uploads
- `fluxImageContoller.js` - Flux image generation
- `knowledgeBase.js` - Knowledge base files
- `userController.js` - User avatars
- `assistantController.js` - Assistant images
- `companyController.js` - Company logos

## Testing

### Run Storage Tests

```bash
# Test current storage configuration
node server/utils/storageTest.js

# Test local storage only
STORAGE_TYPE=local node server/utils/storageTest.js
```

### Test Scenarios

1. **With S3 Credentials**: Should use S3 storage
2. **Without S3 Credentials**: Should fallback to local storage
3. **Force Local Storage**: Should use local storage regardless of S3 credentials
4. **Force S3 Storage**: Should use S3 storage (fails if credentials missing)

## Error Handling

The implementation includes comprehensive error handling:

- **Missing Credentials**: Graceful fallback to local storage
- **Storage Failures**: Proper error messages and logging
- **File Not Found**: Appropriate 404 responses
- **Permission Issues**: Security checks and access control

## Performance Considerations

### S3 Storage
- **Pros**: Scalable, reliable, CDN integration
- **Cons**: Network latency, costs

### Local Storage
- **Pros**: Fast access, no network calls, no additional costs
- **Cons**: Limited scalability, requires backup strategy

## Security

### Local Storage Security
- Path traversal protection
- File type validation
- Access control through Express middleware
- Secure file serving with proper headers

### S3 Security
- Signed URLs for temporary access
- Bucket policies and IAM roles
- Encryption at rest and in transit

## Monitoring and Logging

The implementation includes comprehensive logging:

```javascript
// Storage type detection
console.log('Using S3 storage provider (auto-detected)');
console.log('S3 credentials not found, using local storage provider (auto-detected)');

// Operation logging
console.log('File upload successful:', url);
console.error('Storage operation failed:', error);
```

## Deployment Considerations

### Production Setup

1. **S3 Configuration** (Recommended for production):
   ```bash
   STORAGE_TYPE=s3
   AWS_ACCESS_KEY_ID=your_production_key
   AWS_SECRET_KEY_ID=your_production_secret
   AWS_BUCKET_NAME=your_production_bucket
   ```

2. **Local Storage Configuration** (Development/Testing):
   ```bash
   STORAGE_TYPE=local
   LOCAL_STORAGE_PATH=./uploads
   ```

### Backup Strategy

For local storage in production:
- Regular backups of the uploads directory
- File synchronization to external storage
- Monitoring of disk space usage

## Troubleshooting

### Common Issues

1. **Storage Provider Not Found**:
   - Check environment variables
   - Verify file paths and permissions

2. **File Upload Failures**:
   - Check disk space (local storage)
   - Verify S3 credentials and permissions

3. **File Access Issues**:
   - Check static file serving configuration
   - Verify file paths and permissions

### Debug Mode

Enable debug logging:

```javascript
// Set debug environment variable
DEBUG=storage node server/index.js
```

## Future Enhancements

1. **Multiple Storage Providers**: Support for Google Cloud Storage, Azure Blob
2. **Storage Migration**: Tools to migrate between storage providers
3. **Caching Layer**: Redis-based caching for frequently accessed files
4. **CDN Integration**: Automatic CDN setup for local storage
5. **File Compression**: Automatic image and file compression
6. **Storage Analytics**: Usage monitoring and reporting
