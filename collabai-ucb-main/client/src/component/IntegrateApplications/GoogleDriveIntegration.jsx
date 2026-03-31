import React, { useContext } from 'react';
import { message } from 'antd';

/**
 * Component that safely handles Google Drive integration
 * This component provides a fallback when GoogleOAuthProvider is not available
 */
const GoogleDriveIntegration = ({ setToken, setIsConnected, children }) => {
  // Create a fallback login function
  const fallbackLogin = () => {
    message.error('Google Drive integration is not properly configured. Please contact your administrator.');
  };

  // Pass the fallback login function to children
  return children({ login: fallbackLogin, isCredentialsAvailable: false });
};

export default GoogleDriveIntegration;
