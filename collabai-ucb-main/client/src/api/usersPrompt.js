import { axiosSecureInstance } from "./axios";
import { compId ,loggedInUserRole } from "../constants/localStorage";
import * as ApiConstants from "../constants/Api_constants";
import { message } from "antd";

export const fetchUsersPrompt = async ({ page, limit, searchInputValue }) => {
    try {
      const body = {
        userRole: loggedInUserRole,
        compid: compId,
      };
  
      const query = ApiConstants.USER_PROMPTS_API_SLUG(page, limit, searchInputValue);
  
      const response = await axiosSecureInstance.get(query, body);
  
      const data = response?.data?.user;
      const pagination = response?.data?.page;
      const totalPages = response?.data?.nbhits;
  
      return {
        prompt: data,
        pagination: pagination,
        totalcount: totalPages,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  };
  
  export const fetchSingleUserPrompts = async ({ id,page, date, initFetch, limit }) => {
    try {
      const query = ApiConstants.SINGLE_USER_PROMPTS_API_SLUG(id,page, limit);
  
      const response = await axiosSecureInstance.post(query, { date: date, initFetch: initFetch });

      const totalCount = response?.data?.nbhits
      const pagination = response?.data?.page;
      const result = response?.data?.prompts;
  
      return {
        prompt: result,
        pagination: pagination,
        totalCount: totalCount,
      };
    } catch (error) {
      console.log(error, "error");
      throw error;
    }
  };

  // Export user prompts to CSV
  export const exportUserPromptsToCSV = async (userId, date, setLoading) => {
    try {
      setLoading(true);
      const query = ApiConstants.EXPORT_USER_PROMPTS_API_SLUG(userId);
      
      const response = await axiosSecureInstance.post(query, { 
        date: date 
      }, {
        responseType: 'blob'
      });
      
      if (response.data) {
        // Extract filename from Content-Disposition header if available
        let fileName = `user_prompts_${userId}_${date ? new Date(date).toISOString().split('T')[0] : 'all'}.csv`;
        
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, '');
          }
        } else {
          console.warn("No Content-Disposition header found, using default filename");
        }

        // Create a download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success("Prompts exported successfully");
        return { success: true };
      }
    } catch (error) {
      console.error("Error exporting user prompts:", error);
      message.error("Failed to export prompts. Please try again.");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };


