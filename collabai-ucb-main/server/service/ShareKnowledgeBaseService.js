import { createOpenAiVectorStoreWithFileIds } from "../lib/vectorStore.js";
import KnowledgeBase from "../models/knowledgeBase.js";
import ShareKnowledgeBase from "../models/shareKnowledgeBase.js"
import Teams from "../models/teamModel.js";
import User from "../models/user.js";

export const grantAccessToKnowledgeBaseService = async (id, body) => {
    try {
        const isKnowledgeBaseExists = await KnowledgeBase.findById(id);

        if(!isKnowledgeBaseExists) return false;

        const updateKnowledgeBase = await KnowledgeBase.findByIdAndUpdate(
            id,
            { isKnowledgeBaseShareable: true },
            { new: true }
        );

        if(updateKnowledgeBase) {
            const response = await ShareKnowledgeBase.insertMany(body);
            if(response) {
               const updatedAllChildData =  await KnowledgeBase.updateMany(
                    { parentId: updateKnowledgeBase._id },
                    { $set: { isFileShared: true, isKnowledgeBaseShareable: true,sharedKnowledgeBaseOwner: updateKnowledgeBase?.owner } }    
                );

                if(!updatedAllChildData) {
                    console.error("Couldn't store data to db");
                    return false;
                }

            }
            if(response) {
                return response;
            } 
            else {
                console.error("Couldn't store data to db");
                return false;
            }
        }
        else {
            console.error("Failed to update knowledge base");
            return false;
        }
        
    } catch (error) {
        console.error(error);
        return false;
    }
}

export const removeAccessFromSharedKnowledgeBaseService = async (knowledgeBaseId, body) => {
    try {
        const deletedIds = body.map((user) => user.collaborator).filter(user => user !== undefined);
        const deletedTeams = body.map((user) => user.collaboratorTeam).filter(team => team !== undefined);

        let removeAccess = null;
        if(deletedIds?.length > 0) {
            removeAccess = await ShareKnowledgeBase.deleteMany({
                knowledgeBaseId: knowledgeBaseId,
                collaborator: { $in: deletedIds } ,
            });
        }

        if(deletedTeams?.length > 0) {
            removeAccess = await ShareKnowledgeBase.deleteMany({
                knowledgeBaseId: knowledgeBaseId,
                collaboratorTeam: { $in: deletedTeams } ,
            });
        }

        if(removeAccess) {
            const sharedKnowledgeBase = await ShareKnowledgeBase.find({ knowledgeBaseId: knowledgeBaseId});
            if(sharedKnowledgeBase.length <= 0) {
                const updateKnowledgeBase = await KnowledgeBase.findByIdAndUpdate(
                    knowledgeBaseId,
                    { isKnowledgeBaseShareable: false, isFileShared: false },
                    { new: true }
                );
                await KnowledgeBase.updateMany(
                    { parentId: knowledgeBaseId },
                    { $set: { isFileShared: false, isKnowledgeBaseShareable: false } }
                )
                if(!updateKnowledgeBase) {
                    console.error("Failed to update knowledge base");
                    return false;
                }
                return true;
            }
            return true;
        }
        else {
            console.error("Failed to delete data from db");
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

export const getUserForFolderAccessService = async (knowledgeBaseId, page = 1, limit = 10, searchTerm, userId) => {
    try {
        const existingUsers = await ShareKnowledgeBase.find({knowledgeBaseId: knowledgeBaseId}).select("collaborator");

        const existingUserIds = existingUsers.map(access => access.collaborator);

        let usersWithoutAccess = []

        const query = {
            _id: { $nin: existingUserIds }, 
             $or: [
                { fname: { $regex: searchTerm, $options: 'i' } }, 
                { lname: { $regex: searchTerm, $options: 'i' } } 
            ]
        };

        if(searchTerm) {
            usersWithoutAccess  = await User.find({
                _id: { $nin: [...existingUserIds, userId] },
                 $or: [
                    { fname: { $regex: searchTerm, $options: 'i' } }, 
                    { lname: { $regex: searchTerm, $options: 'i' } } 
                ]
            }).select("_id fname lname email userAvatar");
        } else {
            usersWithoutAccess = await User.find({
                _id: { $nin: [...existingUserIds, userId] }
            }).select("_id fname lname email userAvatar").skip((page - 1) * limit) 
            .limit(parseInt(limit));
        }

        const totalCount = await User.countDocuments(query);

        if(usersWithoutAccess) {
            return {
            success: true,
            data: usersWithoutAccess,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
        }
        }else {
            console.error("Couldn't get data from db");
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
} 

export const getExistingAccessedUsersByFolderService = async (knowledgeBaseId, page = 1, limit = 10) => {
    try {
        let existingUsers = await ShareKnowledgeBase.find({knowledgeBaseId: knowledgeBaseId}).select("collaborator collaboratorTeam").populate([{ 
            path: 'collaborator',
            select: '_id fname lname email userAvatar',
            model: User,
        },{
            path: 'collaboratorTeam',
            select: '_id teamTitle',
            model: Teams,
        }]);

        const users = [];
        const teams = [];
        for (const item of existingUsers) {
            if (item.collaborator) users.push({ ...item.collaborator.toObject(), isTeam: false });
            if (item.collaboratorTeam) teams.push({ ...item.collaboratorTeam.toObject(), isTeam: true });
        }


        let existingUsersList = users;
        let existingTeams = teams;

        existingUsers = existingUsersList.filter(user => user !== null).filter(user => user !== undefined);
        existingTeams = existingTeams.filter(team => team !== null).filter(team => team !== undefined);

        const totalCount = await ShareKnowledgeBase.countDocuments({knowledgeBaseId: knowledgeBaseId});
        if(existingUsers) {
            return {
            success: true,
            data: [...existingUsers,...existingTeams],
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
        }
        }else {
            console.error("Couldn't get data from db");
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
} 

export const getTeamForFolderAccessService = async (knowledgeBaseId, page = 1, limit = 10, searchTerm, userId) => {
    try {
        const existingTeams = await ShareKnowledgeBase.find({knowledgeBaseId: knowledgeBaseId}).select("collaboratorTeam");

        const existingTeamIds = existingTeams.map(access => access.collaboratorTeam);

        let teamsWithoutAccess = []

        const query = {
            _id: { $nin: existingTeamIds }, 
             $or: [
                { teamTitle: { $regex: searchTerm, $options: 'i' } }, 
            ]
        };

        // if(searchTerm) {
            teamsWithoutAccess  = await Teams.find({
                _id: { $nin: [...existingTeamIds, userId] },
                isDeleted: false,
                 $or: [
                    { teamTitle: { $regex: searchTerm, $options: 'i' } }, 
                ]
            }).select("_id teamTitle");
        // }

        const totalCount = await Teams.countDocuments(query);

        if(teamsWithoutAccess) {
            return {
            success: true,
            data: teamsWithoutAccess,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
        }
        }else {
            console.error("Couldn't get data from db");
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
} 