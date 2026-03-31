import { Avatar, Button, Checkbox, List, message, Modal, Skeleton, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import { getUsersForGrantAccess, grantAccessToTeams, grantAccessToUsers, removeAccessToUsers } from '../../../api/knowledgeBase';
import ShareAccessUserList from './ShareAccessUserList/ShareAccessUserList';
import GivenAccessUserList from './GivenAccessUserList/GivenAccessUserList';
import "./style.scss"
import ShareAccessTeamList from './ShareAccessTeamList/ShareAccessTeamList';

const ShareFolderAccess = ({ isShowShareAccessModal, setIsShowShareAccessModal, dataSource, setSelectedFolderData, selectedFolderData, setMount, mount }) => {
  const [key, setKey] = useState('1');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);


  const handleShareAccess = async () => {
    try {
      const requestBody = selectedUserIds?.map((user) => {
        return {
          knowledgeBaseId: selectedFolderData?._id,
          owner: selectedFolderData?.userId,
          collaborator: user
        };
      });
  
      const response = await grantAccessToUsers(selectedFolderData?._id, requestBody);
      if (response) {
        message.success(response.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      // Reset state after handling the access
      setSelectedFolderData({});
      setIsShowShareAccessModal(false);
      setSelectedUserIds([]);
      setKey("1");
      setMount((prevState) => !prevState);
    }
  };
  const handleShareTeamAccess = async () => {
    try {
      const requestBody = selectedTeamIds?.map((user) => {
        return {
          knowledgeBaseId: selectedFolderData?._id,
          owner: selectedFolderData?.userId,
          collaboratorTeam: user
        };
      });

      const response = await grantAccessToTeams(selectedFolderData?._id, requestBody);
      if (response) {
        message.success(response.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      // Reset state after handling the access
      setSelectedFolderData({});
      setIsShowShareAccessModal(false);
      setSelectedTeamIds([]);
      setKey("1");
      setMount((prevState) => !prevState);
    }
  };

  const handleRemoveAccess = async () => {
    try {

      let requestBody = selectedUserIds?.map((user) => {
        return {
          knowledgeBaseId: selectedFolderData?._id,
          owner: selectedFolderData?.userId,
          collaborator: user
        };
      });
      const teamRequestBody = selectedTeamIds?.map((team) => {
        return {
          knowledgeBaseId: selectedFolderData?._id,
          owner: selectedFolderData?.userId,
          collaboratorTeam: team
        };
      });
      requestBody = [...requestBody, ...teamRequestBody];  
      const response = await removeAccessToUsers(selectedFolderData?._id, requestBody);
      if (response) {
        message.success(response.message);
      }
    }catch (error) {
      console.error("error : ", error);
     }
     finally {
      setSelectedFolderData({});
      setIsShowShareAccessModal(false);
      setSelectedUserIds([]);
      setSelectedTeamIds([]);
      setKey("1");
      setMount((prevState) => !prevState)
    }

  }

  const onChange = (key) => {
    setKey(key);
    setSelectedUserIds([]);
  };

  const items = [
    {
      key: '1',
      label: 'Share Access',
      children: (
        <ShareAccessUserList
          isShowShareAccessModal={isShowShareAccessModal}
          selectedFolderData={selectedFolderData}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          mount={mount}
        />
      ),
    },
    {
      key: '2',
      label: 'Share Access With Team',
      children: (
        <ShareAccessTeamList
          isShowShareAccessModal={isShowShareAccessModal}
          selectedFolderData={selectedFolderData}
          selectedTeamIds={selectedTeamIds}
          setSelectedTeamIds={setSelectedTeamIds}
          mount={mount}
        />
      ),
    },
    {
      key: '3',
      label: 'Remove Access',
      children: (
        <GivenAccessUserList 
          isShowShareAccessModal={isShowShareAccessModal}
          selectedFolderData={selectedFolderData}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          selectedTeamIds={selectedTeamIds}
          setSelectedTeamIds={setSelectedTeamIds}
          mount={mount}
        />
    ),
    },

  ];
  const shareOrRemoveAccess = async (key) => {
    if (key === '1') {
      return await handleShareAccess();
    } else if (key === '2') {
      return await handleShareTeamAccess();
    } else {
      return await handleRemoveAccess();
    }
  };

  return (
    <div>
      <Modal
        title="Access Management"
        open={isShowShareAccessModal}
        footer={[
          <Button key="back" onClick={() => {
            setIsShowShareAccessModal(false);
            setSelectedFolderData({});
            setSelectedUserIds([]);
          }}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={async () => await shareOrRemoveAccess(key)} disabled={selectedUserIds.length === 0 && selectedTeamIds.length === 0}>
            Confirm
          </Button>,

        ]}
        className="knowledge-base-modal"

        // // onOk={s}
        onCancel={() => {
          setIsShowShareAccessModal(false);
          setSelectedFolderData({});
          setSelectedUserIds([]);
        }}
      >
        <Tabs activeKey={key} onChange={onChange} items={items} />
      </Modal>
    </div>
  );
};

export default ShareFolderAccess;