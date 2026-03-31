import React from 'react';
import { message } from 'antd';
import { checkGoogleDriveCredentials } from '../../utils/credentialUtils';
import googleDriveIcon from "../../assests/images/knowledge-base-menu/google_drive_icon.svg"

// Fallback component when Google Drive is not configured
const GoogleDriveLoginFallback = () => {
    const handleClick = () => {
        const credentialCheck = checkGoogleDriveCredentials();
        message.error(`Google Drive is not configured. Missing: ${credentialCheck.missingCredentials.join(', ')}. Please contact your administrator.`);
    };

    return (
        <li className="tool-item" onClick={handleClick} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <div className="tool-item-icon">
                <img src={googleDriveIcon} alt="Google Drive Icon" style={{ width: 25, height: 25 }} />
            </div>
            <div className="tool-item-info">
                <div className="tool-name">Import From Google Drive</div>
                <p className="tool-details">Google Drive integration not configured</p>
            </div>
        </li>
    );
};

// Main export that shows fallback when credentials are not available
export const LoginWithGoogle = ({ setToken, setIsConnected }) => {
    const credentialCheck = checkGoogleDriveCredentials();
    const hasGoogleProvider = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    // Always show fallback when credentials are missing or GoogleOAuthProvider is not available
    if (!credentialCheck.isAvailable || !hasGoogleProvider) {
        return <GoogleDriveLoginFallback />;
    }

    // If credentials are available, this means GoogleOAuthProvider should be available
    // but we shouldn't reach this point if the provider isn't set up
    // Show a generic message for now
    const handleClick = () => {
        message.error('Google Drive integration failed to initialize. Please contact your administrator.');
    };

    return (
        <li className="tool-item" onClick={handleClick} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
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
