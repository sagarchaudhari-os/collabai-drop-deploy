import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { axiosSecureInstance } from '../../api/axios';
import { GOOGLE_AUTH_SLUG } from '../../constants/Api_constants';
import { getUserID } from '../../Utility/service';
import googleDriveIcon from "../../assests/images/knowledge-base-menu/google_drive_icon.svg"

// Component that uses Google OAuth when GoogleOAuthProvider is available
export const LoginWithGoogleAuth = ({ setToken, setIsConnected }) => {
    const userId = getUserID();

    // This hook will only work inside GoogleOAuthProvider
    const login = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            try {
                const body = { userId: userId, code: codeResponse.code };
                const response = await axiosSecureInstance.post(GOOGLE_AUTH_SLUG, body);
                const accessToken = response.data.accessToken;
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
            message.error('Google Drive authentication failed.');
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

    return (
        <li className="tool-item" onClick={login}>
            <div className="tool-item-icon">
                <img src={googleDriveIcon} alt="Google Drive Icon" style={{ width: 25, height: 25 }} />
            </div>
            <div className="tool-item-info">
                <div className="tool-name">Import From Google Drive</div>
                <p className="tool-details">Add Google doc, sheet, ppt (max file size 1.5 MB)</p>
            </div>
        </li>
    );
};
