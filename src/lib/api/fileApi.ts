import axiosInstance from "../axiosInstance";

interface UploadResponse {
  url: string;  
  originalFilename: string;
  type: string;
}

export const uploadThumbnail = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axiosInstance.post("/files/thumbnail", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.data;
};

export const uploadEditorImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axiosInstance.post("/files/editor-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};
