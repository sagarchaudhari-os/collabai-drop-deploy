import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { checkGoogleDriveCredentials } from '../../utils/credentialUtils';
import { axiosSecureInstance } from '../../api/axios';
import { GOOGLE_AUTH_SLUG } from '../../constants/Api_constants';
import { getUserID } from '../../Utility/service';

/**
 * Component that uses Google OAuth when GoogleOAuthProvider is available
 * This component should only be rendered when credentials are configured
 */
const GoogleDriveWithAuth = ({ setToken, setIsConnected, children }) => {
  const userId = getUserID();
  const googleDriveCredentialCheck = checkGoogleDriveCredentials();

  // This hook will only work inside GoogleOAuthProvider
  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const body = { userId, code: codeResponse.code };
        const response = await axiosSecureInstance.post(GOOGLE_AUTH_SLUG, body);
        const accessToken = response?.data?.token;
        setToken(accessToken);
        setIsConnected(true);
        message.success('Successfully connected to Google Drive!');
      } catch (error) {
        console.error('Google auth error:', error);
        if (error.response?.status === 503) {
          message.error('Google Drive integration is not configured on the server. Please contact your administrator.');
        } else {
          message.error('Failed to authenticate with Google Drive. Please try again.');
        }
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      message.error('Google Drive authentication failed. Please check your configuration.');
    },
    flow: 'auth-code',
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    prompt: 'consent',
  });

  // Pass the login function to children
  return children({ login: googleLogin, isCredentialsAvailable: googleDriveCredentialCheck.isAvailable });
};

export default GoogleDriveWithAuth;
