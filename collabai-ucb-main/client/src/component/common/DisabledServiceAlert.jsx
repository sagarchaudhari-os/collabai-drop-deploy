import React from 'react';
import { Alert, Button, Space, Tooltip } from 'antd';
import { ExclamationCircleOutlined, SettingOutlined } from '@ant-design/icons';

/**
 * Component to display when a service is disabled due to missing credentials
 */
const DisabledServiceAlert = ({ 
  serviceName, 
  errorMessage, 
  onConfigure, 
  showConfigureButton = true,
  style = {},
  className = ""
}) => {
  return (
    <div style={{ padding: '16px', ...style }} className={className}>
      <Alert
        message={`${serviceName} Integration Disabled`}
        description={
          <div>
            <p>{errorMessage}</p>
            {showConfigureButton && onConfigure && (
              <p style={{ marginTop: '8px', marginBottom: 0 }}>
                Contact your administrator to configure the required credentials.
              </p>
            )}
          </div>
        }
        type="warning"
        icon={<ExclamationCircleOutlined />}
        action={
          showConfigureButton && onConfigure ? (
            <Space>
              <Tooltip title="Contact administrator to configure credentials">
                <Button 
                  size="small" 
                  icon={<SettingOutlined />}
                  onClick={onConfigure}
                >
                  Configure
                </Button>
              </Tooltip>
            </Space>
          ) : null
        }
        showIcon
      />
    </div>
  );
};

export default DisabledServiceAlert;
