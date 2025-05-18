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

  console.log("📦 썸네일 업로드 응답 전체:", res.data); 

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
