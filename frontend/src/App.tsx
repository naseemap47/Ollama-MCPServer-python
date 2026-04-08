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
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response was not ok');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let pendingBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        pendingBuffer += decoder.decode(value, { stream: true });
        const events = pendingBuffer.split('\n\n');
        pendingBuffer = events.pop() || '';

        for (const event of events) {
          if (event.startsWith('data: ')) {
            try {
              const data = JSON.parse(event.substring(6));
              
              if (data.type === 'chunk') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg.role === 'assistant') {
                    newMessages[newMessages.length - 1] = { 
                        ...lastMsg, 
                        content: lastMsg.content + data.text 
                    };
                  } else {
                    newMessages.push({ role: 'assistant', content: data.text });
                  }
                  return newMessages;
                });
              } else if (data.type === 'tool_call') {
                setMessages(prev => [
                   ...prev, 
                   { role: 'tool', content: `Executing ${data.tool_name}...` }, 
                   { role: 'assistant', content: '' } // Next text stream goes here
                ]);
              } else if (data.type === 'tool_result') {
                 setMessages(prev => {
                    const newMessages = [...prev];
                    for (let i = newMessages.length - 1; i >= 0; i--) {
                        if (newMessages[i].role === 'tool') {
                            newMessages[i] = { ...newMessages[i], content: data.result };
                            break;
                        }
                    }
                    return newMessages;
                 });
              } else if (data.type === 'error') {
                 setMessages(prev => [...prev, { role: 'assistant', content: `**Error**: ${data.message}` }]);
              } else if (data.type === 'end') {
                 setIsLoading(false);
              }
            } catch (e) {
               console.error("Failed parsing SSE chunk", e);
            }
          }
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
