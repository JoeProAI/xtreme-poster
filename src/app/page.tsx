"use client";

import { useState } from 'react';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('tactical_playbook');
  const [outputType, setOutputType] = useState('post');
  const [includeImage, setIncludeImage] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, style, outputType, includeImage }),
      });
      const data = await response.json();
      if (data.content) {
        setGeneratedContent(data.content);
      }
      if (data.image) {
        setGeneratedImage(data.image);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      setGeneratedContent('Failed to generate content. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-8">X Banger Creator</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-gray-400 text-xs font-bold mb-2" htmlFor="topic">
              Topic or Phrase
            </label>
            <input
              className="appearance-none block w-full bg-gray-800 text-white border border-gray-700 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-gray-700"
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The future of AI in science"
            />
          </div>
        </div>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
            <label className="block uppercase tracking-wide text-gray-400 text-xs font-bold mb-2" htmlFor="style">
              Style
            </label>
            <div className="relative">
              <select
                className="block appearance-none w-full bg-gray-800 border border-gray-700 text-white py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-700 focus:border-gray-500"
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="tactical_playbook">Tactical Playbook</option>
                <option value="contrarian_take">Contrarian Take</option>
                <option value="story_ladder">Story Ladder</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 px-3">
            <label className="block uppercase tracking-wide text-gray-400 text-xs font-bold mb-2" htmlFor="output-type">
              Output Type
            </label>
            <div className="relative">
              <select
                className="block appearance-none w-full bg-gray-800 border border-gray-700 text-white py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-gray-700 focus:border-gray-500"
                id="output-type"
                value={outputType}
                onChange={(e) => setOutputType(e.target.value)}
              >
                <option value="post">Single Post</option>
                <option value="thread">Thread (5-8 Tweets)</option>
                <option value="long_form">Long-Form</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
              />
              <span className="ml-2 text-gray-400">Generate viral image (GPT Image)</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap -mx-3 mb-2">
          <div className="w-full px-3">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              🚀 Generate Viral Content
            </button>
          </div>
        </div>
      </form>
      {generatedContent && (
        <div className="w-full max-w-2xl mt-8">
          <h2 className="text-2xl font-bold mb-4">🔥 Viral Content Ready</h2>
          
          {generatedImage && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Generated Image</h3>
              <img 
                src={generatedImage} 
                alt="Generated viral image" 
                className="w-full rounded-lg border border-gray-700"
              />
            </div>
          )}
          
          <div className="bg-gray-800 text-white border border-gray-700 rounded p-4 mb-4">
            <pre className="whitespace-pre-wrap font-sans">{generatedContent}</pre>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => navigator.clipboard.writeText(generatedContent)}
            >
              📋 Copy to Clipboard
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedContent)}`, '_blank')}
            >
              🐦 Post to X
            </button>
            {generatedImage && (
              <a
                href={generatedImage}
                download="viral-image.png"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                🖼️ Download Image
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}