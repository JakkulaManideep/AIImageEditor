export interface UploadedImage {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
}

export interface GeneratedResult {
  image: string | null;
  text: string | null;
}
