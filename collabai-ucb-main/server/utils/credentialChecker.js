/**
 * Server-side utility functions for checking Google Drive credential availability
 */

/**
 * Check if Google Drive credentials are available
 * @returns {Object} - { isAvailable: boolean, missingCredentials: string[] }
 */
export const checkGoogleDriveCredentials = () => {
  const missingCredentials = [];
  
  if (!process.env.CLIENT_ID) {
    missingCredentials.push('CLIENT_ID');
  }
  
  if (!process.env.CLIENT_SECRET) {
    missingCredentials.push('CLIENT_SECRET');
  }
  
  // if (!process.env.API_KEY) {
  //   missingCredentials.push('API_KEY');
  // }
  
  return {
    isAvailable: missingCredentials.length === 0,
    missingCredentials,
    serviceName: 'Google Drive'
  };
};

/**
 * Get a user-friendly error message for missing credentials
 * @param {Object} credentialCheck - Result from credential check functions
 * @returns {string} - User-friendly error message
 */
export const getCredentialErrorMessage = (credentialCheck) => {
  const { serviceName, missingCredentials } = credentialCheck;
  
  if (missingCredentials.length === 0) {
    return `${serviceName} credentials are available.`;
  }
  
  const missingList = missingCredentials.join(', ');
  return `Required credentials for ${serviceName} are missing: ${missingList}. Please contact your administrator to configure these environment variables.`;
};

/**
 * Middleware to check if Google Drive service is available before processing requests
 * @returns {Function} - Express middleware function
 */
export const requireGoogleDriveCredentials = () => {
  return (req, res, next) => {
    const credentialCheck = checkGoogleDriveCredentials();
    
    if (!credentialCheck.isAvailable) {
      return res.status(503).json({
        message: `Google Drive integration is not configured. Missing credentials: ${credentialCheck.missingCredentials.join(', ')}. Please contact your administrator.`,
        error: 'GOOGLE_CREDENTIALS_MISSING',
        missingCredentials: credentialCheck.missingCredentials,
        serviceName: credentialCheck.serviceName
      });
    }
    
    // Add credential info to request for use in route handlers
    req.googleDriveCredentials = credentialCheck;
    next();
  };
};
