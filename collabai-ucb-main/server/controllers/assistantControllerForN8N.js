/**
 * @async
 * @function createChatPerAssistant
 * @description Create a new chat for an assistant
 * @param {Object} req - Request object. Should contain the following parameters in body: { question, thread_id [= false] }
 * @param {Object} res - Response object
 * @param {function} next - Next middleware function
 * @returns {Response} 201 - Returns created chat and thread ID
 * @throws {Error} Will throw an error if chat creation failed
 */

import { StatusCodes } from "http-status-codes";
import { getOpenAIInstance } from "../config/openAI.js";
import { createAssistantThread, createMessageInThread, createRunInThread, isOpenAIFileObjectExist, messageListFromThread, retrieveAssistantFromOpenAI, retrieveOpenAIFileObject, retrieveRunFromThread, submitToolOutputs, updateAssistantProperties } from "../lib/openai.js";
import { BadRequest, NotFound } from "../middlewares/customError.js";
import { createAssistantThreadInDb, getAssistantByAssistantID } from "../service/assistantService.js";
import { calculateCostFromTokenCounts, createTrackUsage } from "../service/trackUsageService.js";
import { getUserIdFromApiKey } from "../service/userService.js";
import { onToolCalls, processAssistantMessage, uploadFiles } from "../utils/assistant.js";
import { createChatPerAssistantSchema } from "../utils/validations.js";
import { AssistantMessages } from "../constants/enums.js";
import { handleOpenAIError } from "../utils/openAIErrors.js";
import OpenAI from "openai";
import Assistant from "../models/assistantModel.js";
import n8nAgentInfoModel from "../models/n8nAgentInfoModel.js";
import { mongo } from "mongoose";
import { downloadFile, getFileMetadata } from "./googleAuth.js";
import fs from 'fs';
import path, { join } from 'path';
import mimeType from 'mime-types';
import User from "../models/user.js";
import { extractAllGoogleDriveLinks } from "../utils/googleDriveHelperFunctions.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mime from 'mime';
import { createOpenAiVectorStoreWithFileIds, deleteFilesFromVectorStoreUtils, updateOpenAiVectorStoreName, uploadFilesToVectorStore } from "../lib/vectorStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createChatPerAssistantOFn8nNode = async (req, res, next) => {
  const { assistant_id } = req.params;
  const { question, thread_id = false, apiKey } = req.body;
  let userId = await getUserIdFromApiKey(apiKey);

  // Find agent info for this user/assistant
  let isExistingN8nAgent = await n8nAgentInfoModel.findOne({
    userId: userId,
    agentId: assistant_id,
  });

  // If no agent info, create it (with no threadId yet)
  if (!isExistingN8nAgent) {
    await n8nAgentInfoModel.create({
      userId: userId,
      threadId: null,
      agentId: assistant_id,
    });
    isExistingN8nAgent = await n8nAgentInfoModel.findOne({
      userId: userId,
      agentId: assistant_id,
    });
  }

  let threadId = null;
  // 1. Use thread_id from request if provided
  // if (thread_id) {
  //   threadId = thread_id;
  // } 
  // 2. Else use threadId from DB if it exists
  if (isExistingN8nAgent.threadId && !thread_id) {
    threadId = isExistingN8nAgent.threadId;
  } 
  // 3. Else create a new thread and save it
  else {
    const openai = await getOpenAIInstance();
    const thread = await createAssistantThread(openai);
    if (thread) {
      await createAssistantThreadInDb(assistant_id, userId, thread.id, question);
      threadId = thread.id;
      isExistingN8nAgent.threadId = threadId;
      await isExistingN8nAgent.save();
    } else {
      return res.status(500).json({ message: "Failed to create thread." });
    }
  }

  // Validate request
  const validationResult = createChatPerAssistantSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (validationResult.error) {
    return next(
      BadRequest(
        "The message you submitted was too long, please reload the conversation and submit something shorter."
      )
    );
  }

  try {
    const openai = await getOpenAIInstance();

    // Check if assistant exists in database
    const existingAssistant = await getAssistantByAssistantID(assistant_id);
    if (!existingAssistant) {
      return next(NotFound(AssistantMessages.ASSISTANT_NOT_FOUND));
    }

    // Create a message in the thread
    await createMessageInThread(openai, assistant_id, threadId, question, userId);

    // Create a run and poll for completion
    const run = await createRunInThread(openai, threadId, assistant_id);
    let runId = run.id;
    let retrieveRun = await retrieveRunFromThread(openai, threadId, runId);
    let openAIErrorFlag = false;
    while (retrieveRun.status !== "completed") {
      if (retrieveRun.status === "requires_action") {
        let retrieveRuntwo = await retrieveRunFromThread(openai, threadId, runId);
        let toolOutputs = [];
        const toolCalls = retrieveRuntwo.required_action.submit_tool_outputs.tool_calls;
        toolOutputs = await onToolCalls(assistant_id, toolCalls, existingAssistant.functionCalling);
        await submitToolOutputs(openai, threadId, runId, toolOutputs);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retrieveRun = await retrieveRunFromThread(openai, threadId, runId);
      if (["failed", "cancelled", "expired"].includes(retrieveRun.status)) {
        openAIErrorFlag = true;
        break;
      }
    }
    if (openAIErrorFlag) {
      return next(
        BadRequest(
          "Received an error from openAI, please reload the conversation."
        )
      );
    }

    // Track usage
    const {
      inputTokenPrice,
      outputTokenPrice,
      inputTokenCount,
      outputTokenCount,
      totalCost,
      totalTokens
    } = calculateCostFromTokenCounts(
      retrieveRun?.usage?.prompt_tokens,
      retrieveRun?.usage?.completion_tokens,
      retrieveRun?.model,
      'openai'
    );
    await createTrackUsage({
      userId,
      inputTokenCount,
      outputTokenCount,
      modelUsed: retrieveRun.model,
      inputTokenPrice,
      outputTokenPrice,
      totalTokens,
      totalCost
    });

    // Get the assistant's response
    const threadMessages = await messageListFromThread(openai, threadId);
    const mostRecentMessage = threadMessages.data.find(
      (message) => message.run_id === runId && message.role === "assistant"
    );
    if (mostRecentMessage) {
      const responsePayload = {
        msg_id: mostRecentMessage.id,
        thread_id: threadId,
        response: "",
      };
      responsePayload.response = await processAssistantMessage(
        mostRecentMessage
      );
      return res.status(StatusCodes.CREATED).json({
        botResponse: responsePayload.response,
        threadId: threadId,
      });
    } else {
      console.error("No assistant response found in thread messages.");
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: AssistantMessages.SOMETHING_WENT_WRONG,
      });
    }
  } catch (error) {
    console.error("Error in createChatPerAssistantOFn8nNode:", error);
    if (error instanceof OpenAI.APIError) {
      const customOpenAIError = handleOpenAIError(error);
      return next(customOpenAIError);
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errorMessage: error.message,
    });
  }
};

/**
 * @async
 * @function getAssistantsCreatedByUser
 * @description Get assistants created by a specific user with a given category, considering pagination
 * @param {Object} req - The request object. Expected params: userId. Expected query: page, pageSize
 * @param {Object} res - The response object
 * @throws {Error} Will throw an error if it fails to fetch the assistants
 * @returns {Response} 200 - Returns a list of assistants created by the user
 */

export const getAssistantsCreatedByUserForN8N = async (req, res) => {
  try {
      const authHeader = req.headers['authorization'];
      let userId = null;

  // Check if the Authorization header exists and starts with 'Bearer '
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]; // Extract the token part
    userId = await getUserIdFromApiKey(token)
  }
    const { page = 1, pageSize = 10, searchQuery = "" } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const limit = parseInt(pageSize);

    const query = {
      userId: userId,
      // category: "PERSONAL", // Filter by category "PERSONAL"
      category: { $in: ["PERSONAL", "ORGANIZATIONAL"] },
      is_deleted: false,
      //  is_active: true
    };

    if (typeof searchQuery === "string" && searchQuery?.length) {
      query.$or = [{ name: { $regex: new RegExp(searchQuery, "i") } }];
    }
    const openai = await getOpenAIInstance();

    const [assistants, totalCount] = await Promise.all([
      Assistant.find(query)
      // .populate({
      //   path: "assistantApiId",
      //   model: FunctionDefinition,
      //   select: "name"
      // })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assistant.countDocuments(query),
    ]);

    // Iterate over each assistant and fetch filenames for file_ids
    for (const assistant of assistants) {
      let existingFileIds = [];
      for (const fileId of assistant?.file_ids) {
        const isFileExist = await isOpenAIFileObjectExist(openai, fileId);
        if (isFileExist) {
          existingFileIds.push(fileId);
        }
      }
      assistant.file_ids = existingFileIds;

      const fileNames = await Promise.all(
        assistant.file_ids.map(fileId => retrieveOpenAIFileObject(fileId).then(fileInfo => fileInfo.filename))
      );

      assistant.fileNames = fileNames;
    }
    res.status(StatusCodes.OK).json({
      assistants,
      totalCount,
      message: AssistantMessages.ASSISTANT_FETCHED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error in getAssistantsCreatedByUserForN8N:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message,
    });
  }
};


/**
 * @async
 * @function updateAssistantDataWithFileFromN8N
 * @description Update assistant data and associated files from N8N input (apiKey, urls, etc)
 * @param {Object} req - The request object. Expected body: { apiKey, urls, instructions, model, tools }
 * @param {Object} res - The response object
 * @throws {Error} Will throw an error if it fails to update the assistant
 * @returns {Response} 201 - Returns success message and updated assistant
 */
export const updateAssistantDataWithFileFromN8N = async (req, res, next) => {
  const { assistant_id } = req.params;
  try {
    const { apiKey, urls, instructions, model, tools: toolsString = '', prompt = null } = req.body;
    if (!apiKey) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'apiKey is required' });
    }
    // apiKey is base64 string with 3 parts separated by dot
    const [userIdB64] = apiKey.split('.');
    let userId;
    try {
      userId = Buffer.from(userIdB64, 'base64').toString('utf-8');
    } catch (e) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid apiKey format' });
    }
    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
    }
    // Download Google Drive files from urls if present and not empty
    let files = [];
    if (Array.isArray(urls) && urls.length > 0) {
      for (const url of urls) {
        let googleIds = [];
        const links = extractAllGoogleDriveLinks(url, googleIds);
        if (!googleIds[0]) continue;
        const { fileName, mimeType, fileSize } = await getFileMetadata(googleIds[0], userId);
        const baseDir = path.join(__dirname, './../docs/googleDrive');
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }
        const fileDirectory = await downloadFile(googleIds[0], fileName, mimeType, baseDir);
        const normalizedPath = path.resolve(fileDirectory);
        let fileSizeInBytes = fileSize;
        let encodingInfo = 'N/A';
        // const mime = require('mime-types');
        const fileObject = {
          fieldname: 'files',
          originalname: fileName,
          encoding: encodingInfo,
          mimetype: mime.getType(fileName) || 'application/octet-stream',
          destination: '../docs/googleDrive/',
          filename: fileName,
          path: normalizedPath,
          size: fileSizeInBytes,
          key: googleIds[0],
          url: url
        };
        files.push(fileObject);
      }
    }
    // Get assistant by userId (assume one assistant per user for N8N, or adapt as needed)
    const existingAssistant = await Assistant.findOne({ assistant_id });
    if (!existingAssistant) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Assistant not found for user' });
    }
    let fileSearch = false;
    for(const tool of existingAssistant.tools){
      if(tool?.type ==='file_search'){
        fileSearch =  true;
    }
    }
    const openai = await getOpenAIInstance();
    if (!existingAssistant?.vectorStoreId) {
      const vectorStore = fileSearch ? await createOpenAiVectorStoreWithFileIds(openai, existingAssistant?.name, []) : null;
      existingAssistant.vectorStoreId = fileSearch ? vectorStore.id : null;
      await existingAssistant.save();
    }
    const updatedVectorStore = await updateOpenAiVectorStoreName(openai, existingAssistant?.vectorStoreId, existingAssistant?.name);

    // Upload files to OpenAI and update assistant
    let fileIds = existingAssistant.file_ids || [];
    let newFileIds = [];
    let assistantInformation = [];
    let fileIdWithExtension =[],fileSearchIds =[]
    if (files.length > 0) {
      try {
        newFileIds = await uploadFiles(openai, files, assistantInformation, fileIdWithExtension, fileSearchIds);
        fileIds = [...fileIds, ...newFileIds];
        await uploadFilesToVectorStore(openai, existingAssistant?.vectorStoreId, fileIds);
        
      } catch (fileError) {
        return next(new Error(`Failed to upload files: ${fileError.message}`));
      }
    }
    // Prepare tools (only update if present)
    let parsedTools = existingAssistant.tools || [];
    let updateTools = false;
    if (typeof toolsString !== 'undefined' && toolsString !== null && toolsString !== '') {
      try {
        const toolsArr = typeof toolsString === 'string' ? JSON.parse(toolsString) : toolsString;
        parsedTools = toolsArr.map((tool) => (tool !== 'function' ? { type: tool } : null)).filter(Boolean);
        updateTools = true;
      } catch (e) {
        parsedTools = existingAssistant.tools || [];
      }
    }
    // Only update fields if present in request, otherwise keep existing
    const updateData = {
      tool_resources: {
        code_interpreter: { file_ids: fileIds },
      },
    };
    if (typeof instructions !== 'undefined') updateData.instructions = instructions;
    if (typeof model !== 'undefined') updateData.model = model;
    if (updateTools) updateData.tools = parsedTools;
    const updatedOpenaiAssistant = await updateAssistantProperties(openai, existingAssistant.assistant_id, updateData);
    // Update DB only for provided fields
    if (typeof instructions !== 'undefined') existingAssistant.instructions = instructions;
    if (typeof model !== 'undefined') existingAssistant.model = model;
    if (updateTools) existingAssistant.tools = parsedTools;
    existingAssistant.file_ids = fileIds;

    await existingAssistant.save();

    res.status(StatusCodes.CREATED).json({ message: 'Assistant updated from N8N', assistant: existingAssistant, newFileIds });
  } catch (error) {
    console.log('Error in updateAssistantDataWithFileFromN8N:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

      /**
       * @async
       * @function deleteAssistantFilesByIdsFromN8N
       * @description Deletes specific files from OpenAI and removes their IDs from the assistant's DB info
       * @param {Object} req - The request object. Expected params: assistant_id. Expected body: { fileIds: [string] }
       * @param {Object} res - The response object
       * @returns {Response} 200 - Returns success message and updated assistant
       */
  export const deleteAssistantFilesByIdsFromN8N = async (req, res) => {
        const { assistant_id } = req.params;
        const { fileIds } = req.body;
        if (!Array.isArray(fileIds) || fileIds.length === 0) {
          return res.status(400).json({ message: 'fileIds array is required' });
        }
        try {
          const openai = await getOpenAIInstance();
          const assistant = await Assistant.findOne({ assistant_id });
          if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
          }
          // Remove files from OpenAI
          let deletedFiles = [];
          if (assistant.vectorStoreId) {
                try {
                  // await openai.beta.vectorStores.files.deleteBatch(
                  //   assistant.vectorStoreId,
                  //   { file_ids: fileIds }
                  // );
                  await deleteFilesFromVectorStoreUtils(openai, assistant.vectorStoreId, fileIds);

                } catch (err) {
                  // Ignore vector store errors, log for debugging
                  console.log(
                    "Error deleting files from vector store: ",
                    err.message
                  );
                }
          }
          for (const fileId of fileIds) {
            try {
              await openai.files.del(fileId);
              deletedFiles.push(fileId);
            } catch (err) {
              // Ignore if file not found in OpenAI, continue
            }
          }
          // Remove fileIds from assistant DB info
          assistant.file_ids = (assistant.file_ids || []).filter(id => !fileIds.includes(id));
          await assistant.save();
          return res.status(200).json({ message: 'Selected files deleted from OpenAI and assistant updated', deletedFiles, assistant });
        } catch (error) {
          return res.status(500).json({ message: error.message });
        }
      };

      /**
       * @async
       * @function deleteAllAssistantFilesFromN8N
       * @description Deletes all files from OpenAI for an assistant and removes all fileIds from the assistant's DB info
       * @param {Object} req - The request object. Expected params: assistant_id
       * @param {Object} res - The response object
       * @returns {Response} 200 - Returns success message and updated assistant
       */
  export const deleteAllAssistantFilesFromN8N = async (req, res) => {

        const { assistant_id } = req.params;
        try {
          const openai = await getOpenAIInstance();
          const assistant = await Assistant.findOne({ assistant_id });
          if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
          }
          const fileIds = assistant.file_ids || [];
          let deletedFiles = [];
          if (assistant.vectorStoreId) {
                try {
                  // await openai.beta.vectorStores.files.deleteBatch(
                  //   assistant.vectorStoreId,
                  //   { file_ids: fileIds }
                  // );
                  await deleteFilesFromVectorStoreUtils(openai, assistant.vectorStoreId, fileIds);
                } catch (err) {
                  // Ignore vector store errors, log for debugging
                  console.log(
                    "Error deleting files from vector store: ",
                    err.message
                  );
                }
          }
          for (const fileId of fileIds) {
            try {
              await openai.files.del(fileId);
              deletedFiles.push(fileId);
            } catch (err) {
              // Ignore if file not found in OpenAI, continue
              console.log("Error deleting fileId ", fileId, ": ", err.message);
            }
          }
          assistant.file_ids = [];
          await assistant.save();
          return res.status(200).json({ message: 'All files deleted from OpenAI and assistant updated', deletedFiles, assistant });
        } catch (error) {
          return res.status(500).json({ message: error.message });
        }
    };

    /**
 * @async
 * @function updateAssistantData
 * @description Update assistant data 
 * @param {Object} req - The request object. Expected params: assistant_id. Assistant properties in the request body
 * @param {Object} res - The response object
 * @throws {Error} Will throw an error if it fails to update the assistant
 * @returns {Response} 201 - Returns success message and updated assistant
 */
export const updateAssistantData = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    let userId = null;

    // Check if the Authorization header exists and starts with 'Bearer '
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]; // Extract the token part
      try{
        userId = await getUserIdFromApiKey(token);
      }catch(error){
        console.log("Error getting userId from API key:", error);
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid apiKey format' });
      }
    }

    const { assistant_id } = req.params;
    const { instructions = "", model = "", description = "" } = req.body;

    const openai = await getOpenAIInstance();
    const existingAssistant = await getAssistantByAssistantID(assistant_id);

    if (!existingAssistant) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: AssistantMessages.ASSISTANT_NOT_FOUND,
      });
    }
    const myAssistant = await retrieveAssistantFromOpenAI(openai, assistant_id);
    let updateData = {};
    if (myAssistant) {
      updateData = {
        instructions: instructions || myAssistant.instructions,
        model: model || myAssistant.model,
        description: description || myAssistant.description,
      };
    }
    const myUpdatedAssistant = await updateAssistantProperties(
      openai,
      assistant_id,
      updateData
    );

    if (myUpdatedAssistant) {
      myUpdatedAssistant.instructions = instructions;
      const updatedAssistantFieldsObject = {
        instructions: myUpdatedAssistant.instructions,
        model: myUpdatedAssistant.model,
        description: myUpdatedAssistant.description,
      };

      Object.assign(existingAssistant, updatedAssistantFieldsObject);

      await existingAssistant.save();
    }

    res.status(StatusCodes.CREATED).json({
      message: AssistantMessages.FILES_AND_PROPERTIES_UPDATED,
      assistant: existingAssistant,
    });
  } catch (error) {
    console.log("Error in updateAssistantDataWithFile:", error);
    if (error instanceof OpenAI.APIError) {
      const customOpenAIError = handleOpenAIError(error);
      return next(error);
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message,
    });
  }
};
