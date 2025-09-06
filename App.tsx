import React, { useState, useCallback } from 'react';
import { UploadedImage, GeneratedResult } from './types';
import { mergeImagesWithAI } from './services/geminiService';
import Loader from './components/Loader';

const Header: React.FC = () => (
  <div className="text-center mb-8">
    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
      AI Image Fusion
    </h1>
    <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
      Combine subjects from multiple images into a new scene with an AI-generated background. Upload 2 to 5 images to begin.
    </p>
  </div>
);

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const RemoveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ImagePreviewProps {
    image: UploadedImage;
    onRemove: (id: string) => void;
}
const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onRemove }) => (
    <div className="relative group w-full h-32 rounded-lg overflow-hidden shadow-lg">
        <img src={image.base64} alt={image.file.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
            <button
                onClick={() => onRemove(image.id)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                aria-label="Remove image"
            >
                <RemoveIcon />
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [backgroundPrompt, setBackgroundPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    Array.from(files).forEach(file => {
      if (uploadedImages.length + newImages.length >= 5) {
        setError("You can upload a maximum of 5 images.");
        return;
      }
      if (!allowedTypes.includes(file.type)) {
          setError(`File type ${file.type} is not supported. Please use JPG, PNG, or WEBP.`);
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          newImages.push({
            id: `${file.name}-${Date.now()}`,
            file,
            base64: e.target.result,
            mimeType: file.type
          });
          if (newImages.length === files.length) {
              setUploadedImages(prev => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    setError(null);
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSubmit = useCallback(async () => {
    if (uploadedImages.length < 2 || !backgroundPrompt.trim()) {
      setError("Please upload at least 2 images and provide a background description.");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    setGeneratedResult(null);

    try {
      const result = await mergeImagesWithAI(uploadedImages, backgroundPrompt);
      setGeneratedResult(result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unexpected error occurred.");
        }
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImages, backgroundPrompt]);

  const isValidToSubmit = uploadedImages.length >= 2 && backgroundPrompt.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 md:p-8 relative">
      {isLoading && <Loader message="Generating your scene..." />}
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 flex flex-col gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-purple-300">1. Upload Your Images</h2>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-gray-700/50 transition-colors duration-300">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center">
                                <UploadIcon />
                                <p className="mt-2 text-sm text-gray-400">
                                  <span className="font-semibold text-purple-400">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP (Max 5 images)</p>
                            </div>
                            <input id="file-upload" name="file-upload" type="file" multiple accept="image/png, image/jpeg, image/webp" className="sr-only" onChange={handleFileChange} />
                        </label>
                    </div>
                    {uploadedImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-4">
                            {uploadedImages.map(img => (
                                <ImagePreview key={img.id} image={img} onRemove={handleRemoveImage} />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2 text-purple-300">2. Describe the Background</h2>
                    <textarea
                        value={backgroundPrompt}
                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                        placeholder="e.g., a futuristic city skyline at sunset, a serene enchanted forest, a bustling medieval marketplace..."
                        className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-gray-200 placeholder-gray-500 resize-none"
                    />
                </div>
                 
                <button
                    onClick={handleSubmit}
                    disabled={!isValidToSubmit || isLoading}
                    className="w-full py-3 px-6 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isLoading ? 'Fusing Images...' : 'Fuse Images'}
                </button>
                {error && <p className="text-red-400 text-center mt-2">{error}</p>}
            </div>

            {/* Output Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 flex flex-col items-center justify-center min-h-[400px] lg:min-h-0">
                <h2 className="text-2xl font-semibold mb-4 text-purple-300 self-start">Generated Result</h2>
                <div className="w-full h-full flex items-center justify-center bg-gray-700/50 rounded-lg">
                    {generatedResult?.image ? (
                        <img src={generatedResult.image} alt="Generated scene" className="max-w-full max-h-full object-contain rounded-lg" />
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Your fused image will appear here.</p>
                        </div>
                    )}
                </div>
                {generatedResult?.text && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg w-full">
                        <h3 className="font-semibold text-purple-300 mb-1">AI Description:</h3>
                        <p className="text-sm text-gray-300">{generatedResult.text}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
