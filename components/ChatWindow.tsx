
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';
import { IconChat, IconSend, IconUser, IconSparkles, IconLoader, IconQuote } from './icons';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isChatting: boolean;
  disabled: boolean;
  onHighlight: (citations: string[]) => void;
  activeHighlights: string[];
}

// A component to render model content, removing the <cite> tags and using markdown.
const ModelMessageContent: React.FC<{ content: string }> = ({ content }) => {
  // Remove <cite> tags for rendering, as they are handled separately for highlighting.
  const cleanContent = content.replace(/<\/?cite>/g, '');

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

// --- Message component moved outside of ChatWindow ---
interface MessageProps {
  message: ChatMessage;
  onHighlight: (citations: string[]) => void;
  activeHighlights: string[];
}

const Message: React.FC<MessageProps> = ({ message, onHighlight, activeHighlights }) => {
  const isModel = message.role === 'model';
  const hasCitations = message.citations && message.citations.length > 0;
  
  // Check if the citations for this message are the ones currently active
  const isCurrentlyHighlighted = hasCitations && activeHighlights.length > 0 && activeHighlights.includes(message.citations![0]);

  const handleHighlightClick = () => {
    if (hasCitations) {
      onHighlight(message.citations!);
    }
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isModel ? '' : 'flex-row-reverse'} animate-fadeInUp`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isModel ? 'bg-primary text-on-primary' : 'bg-gray-200 text-gray-600'}`}>
        {isModel ? <IconSparkles className="w-5 h-5" /> : <IconUser className="w-5 h-5" />}
      </div>
      <div className={`p-3 rounded-lg max-w-md relative group ${isModel ? 'bg-gray-100 text-gray-800' : 'bg-primary-light text-on-primary'}`}>
        {isModel ? (
          <ModelMessageContent content={message.content} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        {hasCitations && (
          <button 
            onClick={handleHighlightClick}
            title={isCurrentlyHighlighted ? "Hide citations" : "Show citations"}
            className={`absolute -bottom-3 -right-3 p-1 rounded-full bg-white shadow-md hover:bg-gray-200 transition-all ${isCurrentlyHighlighted ? 'text-primary' : 'text-gray-400'}`}
          >
            <IconQuote className="w-4 h-4"/>
          </button>
        )}
      </div>
    </div>
  );
};


export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isChatting, disabled, onHighlight, activeHighlights }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isChatting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isChatting) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-grow overflow-y-scroll p-4 border rounded-lg bg-gray-50 mb-4 min-h-[300px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <p className="font-semibold">Chat history will appear here.</p>
            <p className="text-sm">{disabled ? "First, analyze a PDF." : "Ask a question about the document content."}</p>
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => (
              <Message 
                key={index} 
                message={msg} 
                onHighlight={onHighlight} 
                activeHighlights={activeHighlights} 
              />
            ))}
            {isChatting && (
               <div className="flex items-start gap-3 my-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-on-primary">
                    <IconSparkles className="w-5 h-5" />
                </div>
                 <div className="p-3 rounded-lg max-w-md bg-gray-100 text-gray-800">
                    <IconLoader className="w-5 h-5 animate-spin"/>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? "Upload a document first" : "Ask a question..."}
          disabled={isChatting || disabled}
          className="flex-grow w-full px-4 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <button
          type="submit"
          disabled={isChatting || disabled || !input.trim()}
          className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-on-primary bg-secondary hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <IconSend className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
