import ReactMarkdown from 'react-markdown';
import { User, Robot } from '@phosphor-icons/react';
import type { Message } from '../App';

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  if (message.role === 'tool') return null; // Fallback, shouldn't render alone

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '8px' }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: '50%', 
        background: isUser ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {isUser ? <User size={18} weight="bold" color="#fff" /> : <Robot size={18} weight="regular" color="var(--accent-primary)" />}
      </div>
      <div className={`message-box ${isUser ? 'message-user' : 'message-assistant'}`}>
        {isUser ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{message.content || '*Thinking...*'}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
