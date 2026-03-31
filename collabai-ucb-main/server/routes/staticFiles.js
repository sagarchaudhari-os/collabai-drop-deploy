import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mime from 'mime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Serve static files from uploads directory
 * This route is used when local storage is active
 */
router.get('/uploads/*', async (req, res) => {
  try {
    // Get the file path from the request
    const filePath = req.params[0]; // Everything after /uploads/
    const fullPath = path.join(__dirname, '../uploads', filePath);
    
    // Security check - ensure the file is within the uploads directory
    const uploadsDir = path.resolve(__dirname, '../uploads');
    const resolvedFilePath = path.resolve(fullPath);
    
    if (!resolvedFilePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(fullPath);
    
    // Check if it's a file (not directory)
    if (!stats.isFile()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Set appropriate headers
    const contentType = mime.getType(fullPath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
    
  } catch (error) {
    console.error('Error serving static file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
