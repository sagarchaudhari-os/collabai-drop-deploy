import { useContext, useEffect } from 'react';
import useDrivePicker from 'react-google-drive-picker';
import { FileContext } from '../../contexts/FileContext';
import { getUserID } from '../../Utility/service';
import { getGoogleAuthCredentials } from '../../api/googleAuthApi';
import { message } from 'antd';

const useGoogleDrivePicker = (handlePicked) => {
  const {token,setToken,setIsConnected} = useContext(FileContext);
  const [openPicker] = useDrivePicker();

  useEffect(() => {
    getGoogleAuthCredentials(getUserID(), setIsConnected, setToken);
  }, []);

  const handleOpenPicker = (apiKey) => {
    try {
      // Validate required parameters
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error('Google Client ID is not configured');
        message.error('Google Drive client ID is missing. Please contact your administrator.');
        return;
      }
      
      if (!apiKey) {
        console.error('Google API key is not provided');
        message.error('Google Drive API key is missing. Please contact your administrator.');
        return;
      }
      
      if (!token) {
        console.error('Authentication token is not available');
        message.error('Please authenticate with Google Drive first.');
        return;
      }

      openPicker({
        clientId: clientId,
        developerKey: apiKey,
        customScopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
          'profile', 
          'email', 
          'https://www.googleapis.com/auth/drive', 
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],

        viewId: 'DOCS',
        token: token,
        showUploadView: false,
        multiselect: true,
        viewMimeTypes : 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.google-apps.spreadsheet,application/vnd.google-apps.presentation,application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.presentationml.presentation',

        supportDrives: true,
        onAuthenticate: () => console.log('Authentication successful'),
        onError: (error) => {
          console.error('Error loading picker:', error);
          message.error('Failed to load Google Drive picker. Please try again.');
        },
        callbackFunction: (data) => {
          try {
            if (data.action === 'cancel') {
              console.log('User clicked cancel/close button');
              return;
            }
            handlePicked(data);
          } catch (error) {
            console.error('Error in picker callback:', error);
            message.error('Error processing selected files. Please try again.');
          }
        },
      });
    } catch (error) {
      console.error('Error opening Google Drive picker:', error);
      message.error('Failed to open Google Drive picker. Please check your configuration.');
    }
  };

  return handleOpenPicker;
};

export default useGoogleDrivePicker;
