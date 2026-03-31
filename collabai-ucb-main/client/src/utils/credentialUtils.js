/**
 * Utility functions for checking Google Drive credential availability and handling optional integration
 */

/**
 * Check if Google Drive credentials are available
 * @returns {Object} - { isAvailable: boolean, missingCredentials: string[] }
 */
export const checkGoogleDriveCredentials = () => {
  const missingCredentials = [];
  
  if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
    missingCredentials.push('REACT_APP_GOOGLE_CLIENT_ID');
  }
  
  if (!process.env.REACT_APP_GOOGLE_API_KEY) {
    missingCredentials.push('REACT_APP_GOOGLE_API_KEY');
  }
  
  // Note: REACT_APP_GOOGLE_CLIENT_SECRET is not used in the current implementation
  // but we can check for it if needed in the future
  // if (!process.env.REACT_APP_GOOGLE_CLIENT_SECRET) {
  //   missingCredentials.push('REACT_APP_GOOGLE_CLIENT_SECRET');
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
 * Check if Google Drive service should be enabled based on credentials
 * @returns {Object} - { isEnabled: boolean, errorMessage?: string }
 */
export const isGoogleDriveEnabled = () => {
  const credentialCheck = checkGoogleDriveCredentials();
  
  return {
    isEnabled: credentialCheck.isAvailable,
    errorMessage: credentialCheck.isAvailable ? null : getCredentialErrorMessage(credentialCheck)
  };
};

/**
 * Safe wrapper for Google API calls that handles missing credentials
 * @param {Function} apiCall - The Google API function to call
 * @param {string} serviceName - Name of the service
 * @returns {Promise} - Promise that resolves with result or rejects with credential error
 */
export const safeGoogleApiCall = async (apiCall, serviceName = 'Google Drive') => {
  const credentialCheck = checkGoogleDriveCredentials();
  
  if (!credentialCheck.isAvailable) {
    throw new Error(getCredentialErrorMessage(credentialCheck));
  }
  
  try {
    return await apiCall();
  } catch (error) {
    // If it's a credential-related error, provide a more user-friendly message
    if (error.message.includes('API key') || error.message.includes('client_id')) {
      throw new Error(`Google Drive integration is not properly configured. Please contact your administrator.`);
    }
    throw error;
  }
};

/**
 * Create a disabled state component for services with missing credentials
 * @param {string} serviceName - Name of the service
 * @param {string} errorMessage - Error message to display
 * @returns {Object} - Component props for disabled state
 */
export const createDisabledServiceProps = (serviceName, errorMessage) => ({
  disabled: true,
  title: `Configure ${serviceName} credentials to enable this feature`,
  errorMessage,
  showAlert: true
});
