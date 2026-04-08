import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Robot } from '@phosphor-icons/react';
import type { Message } from '../App';

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  if (message.role === 'tool') return null;

  // Sometimes models generate tables without proper newlines before the header, or stringify tables into single lines.
  // Heuristic: replace " | |" with " |\n|" to reconstruct rows.
  let content = message.content || '*Thinking...*';
  content = content.replace(/ \| \|/g, ' |\n|');
  
  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-container">
        <div className={`avatar ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? <User size={20} weight="fill" color="#fff" /> : <Robot size={20} weight="fill" color="#fff" />}
        </div>
        <div className="message-content">
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
