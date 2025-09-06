import { GoogleGenAI, Modality, Part, GenerateContentResponse } from "@google/genai";
import { UploadedImage, GeneratedResult } from '../types';

// FIX: Per coding guidelines, initialize GoogleGenAI with `process.env.API_KEY` directly.
// This also resolves the TypeScript error related to `import.meta.env`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const mergeImagesWithAI = async (
  images: UploadedImage[],
  backgroundPrompt: string
): Promise<GeneratedResult> => {

  try {
    const fullPrompt = `Merge the subjects from the provided images into a single, cohesive new image. The new background for this scene should be: "${backgroundPrompt}". Please ensure the lighting and shadows on the subjects match the new background for a realistic and natural look.`;

    const parts: Part[] = [
      { text: fullPrompt },
      ...images.map(img => {
        const base64Data = img.base64.split(',')[1];
        if (!base64Data) {
            throw new Error(`Invalid base64 data for image ${img.file.name}`);
        }
        return {
          inlineData: {
            mimeType: img.mimeType,
            data: base64Data,
          },
        };
      })
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: GeneratedResult = { image: null, text: null };
    
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                result.image = base64Image;
            } else if (part.text) {
                result.text = part.text;
            }
        }
    }

    if (!result.image) {
      throw new Error("The AI did not return an image. Please try adjusting your prompt or using different images.");
    }
    
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
  }
};
