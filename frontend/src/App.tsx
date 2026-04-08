import { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight, Robot } from '@phosphor-icons/react';
import ChatMessage from './components/ChatMessage';
import ToolExecutionBlock from './components/ToolExecutionBlock';

export type Role = 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const previousMessages = [...messages, userMessage];
    setMessages(previousMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        if (data.messages[0].role === 'user' && data.messages[0].content === input) {
            const serverMessages: Message[] = data.messages;
            if (serverMessages.length >= 2 && serverMessages[0].role === 'user') {
                const newMessages = serverMessages.slice(1);
                setMessages([...previousMessages, ...newMessages]);
            } else {
                setMessages([...previousMessages, ...serverMessages]);
            }
        } else {
            setMessages([...previousMessages, ...data.messages]);
        }
      }
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: '**Error**: Failed to communicate with server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const renderMessages = () => {
    const rendered = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      if (msg.role === 'assistant' && i + 1 < messages.length && messages[i + 1].role === 'tool') {
        const thought = msg.content;
        const toolRes = messages[i + 1].content;
        rendered.push(<ToolExecutionBlock key={i} thought={thought} toolOutput={toolRes} />);
        i += 2;
      } else {
        rendered.push(<ChatMessage key={i} message={msg} />);
        i++;
      }
    }
    return rendered;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        Agent AI
      </header>

      <div className="messages-list">
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
             <Robot size={48} color="var(--border-color)" weight="duotone" style={{ marginBottom: '1rem' }} />
             <h2>How can I help you today?</h2>
          </div>
        ) : (
          renderMessages()
        )}
        
        {isLoading && (
          <div className="message-row assistant">
            <div className="message-container">
              <div className="avatar assistant">
                 <Robot size={20} weight="fill" color="#fff" />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="input-container">
            <textarea
              className="chat-textarea"
              placeholder="Message Agent AI..."
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                  e.currentTarget.style.height = 'auto';
                }
              }}
              rows={1}
            />
            <button 
              className="send-button"
              disabled={!input.trim() || isLoading}
              onClick={() => {
                handleSubmit();
                document.querySelectorAll('.chat-textarea').forEach(el => (el as HTMLElement).style.height = 'auto');
              }}
            >
              <PaperPlaneRight weight="fill" size={24} color={input.trim() ? "var(--text-primary)" : "var(--text-secondary)"} />
            </button>
          </div>
          <div className="disclaimer">
            Agent AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
