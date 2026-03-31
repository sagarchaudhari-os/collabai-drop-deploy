// GoogleDrive.js
import React, { useEffect, useState } from 'react';
import { gapi } from 'gapi-script';
import { checkGoogleDriveCredentials, safeGoogleApiCall } from '../../utils/credentialUtils';
import DisabledServiceAlert from '../common/DisabledServiceAlert';

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

const GoogleDrive = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [credentialsCheck, setCredentialsCheck] = useState(null);

  useEffect(() => {
    // Check credentials first
    const credentialCheck = checkGoogleDriveCredentials();
    setCredentialsCheck(credentialCheck);

    if (!credentialCheck.isAvailable) {
      setInitializationError(credentialCheck);
      return;
    }

    const start = () => {
      gapi.load('client:auth2', initClient);
    }

    const initClient = () => {
      gapi.client.init({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      }).then(() => {
        const authInstance = gapi.auth2.getAuthInstance();
        setIsAuthenticated(authInstance.isSignedIn.get());
        authInstance.isSignedIn.listen(setIsAuthenticated);
        setIsInitialized(true);
        setInitializationError(null);
      }).catch((error) => {
        console.error('Error initializing Google API client:', error);
        setInitializationError({
          isAvailable: false,
          missingCredentials: [],
          serviceName: 'Google Drive',
          error: error.message
        });
      });
    }

    start();
  }, []);

  const handleAuthClick = async () => {
    if (!isInitialized || initializationError) {
      console.error('Google Drive is not properly initialized');
      return;
    }

    try {
      await safeGoogleApiCall(async () => {
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
          await authInstance.signIn().then(
            () => {
              console.log('Sign-in successful');
            },
            (error) => {
              if (error.error === 'popup_closed_by_user') {
                console.log('Popup closed by user. Please try again.');
              } else {
                console.error('Error during sign-in:', error);
              }
            }
          );
        } else {
          console.error('Google API client not initialized');
        }
      }, 'Google Drive');
    } catch (error) {
      console.error('Error during sign-in:', error);
    }
  };

  const handleSignoutClick = async () => {
    if (!isInitialized || initializationError) {
      console.error('Google Drive is not properly initialized');
      return;
    }

    try {
      await safeGoogleApiCall(async () => {
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
          await authInstance.signOut();
        } else {
          console.error('Google API client not initialized');
        }
      }, 'Google Drive');
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };

  const listFiles = async () => {
    if (!isInitialized || initializationError) {
      console.error('Google Drive is not properly initialized');
      return;
    }

    try {
      await safeGoogleApiCall(async () => {
        const response = await gapi.client.drive.files.list({
          'pageSize': 10,
          'fields': 'nextPageToken, files(id, name)',
        });
        setFiles(response.result.files);
      }, 'Google Drive');
    } catch (error) {
      console.error('Error listing files:', error);
    }
  };

  const openFile = (fileId) => {
    const url = `https://drive.google.com/file/d/${fileId}/view`;
    window.open(url, '_blank');
  };

  // Show disabled service alert if credentials are missing
  if (initializationError && !credentialsCheck?.isAvailable) {
    return (
      <DisabledServiceAlert
        serviceName="Google Drive"
        errorMessage={`Required credentials for Google Drive are missing: ${credentialsCheck?.missingCredentials?.join(', ')}. Please contact your administrator to configure these environment variables.`}
        onConfigure={() => {
          // You can add logic here to open a configuration modal or redirect to settings
          console.log('Configure Google Drive credentials');
        }}
      />
    );
  }

  // Show loading state while initializing
  if (!isInitialized && !initializationError) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p>Initializing Google Drive integration...</p>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initializationError && credentialsCheck?.isAvailable) {
    return (
      <DisabledServiceAlert
        serviceName="Google Drive"
        errorMessage={`Failed to initialize Google Drive integration: ${initializationError.error || 'Unknown error'}. Please try refreshing the page or contact support.`}
        onConfigure={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {!isAuthenticated ? (
        <button onClick={handleAuthClick}>Authorize</button>
      ) : (
        <button onClick={handleSignoutClick}>Sign Out</button>
      )}
      {isAuthenticated && (
        <>
          <button onClick={listFiles}>List Files</button>
          <ul>
            {files.map(file => (
              <li key={file.id}>
                {file.name}
                <button onClick={() => openFile(file.id)}>Open</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default GoogleDrive;
