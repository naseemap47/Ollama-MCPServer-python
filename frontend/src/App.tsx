import { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';
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
    
    // We append the user message optimisticly
    // The API returns the interaction sequence array, usually we want to append the remaining to the history.
    // For simplicity, we assume the API returns the full history up to that point. If not, we just append it.
    
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
      
      // Depending on API, "messages" could be the full list or just the new messages.
      // If the first message in the response is the user's current query, it's likely the full turn.
      if (data.messages && data.messages.length > 0) {
        if (data.messages[0].role === 'user' && data.messages[0].content === input) {
            // It's returning the whole turn or history. 
            // In a stateful API, it might return all messages. Let's just set the state to what it returns if it starts with User.
            // If the chat goes on, we'll append if the backend doesn't track history, otherwise replace.
            
            // For now, let's just append the newly generated messages, ignoring the first user message 
            // from the returned list if it matches ours.
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

  const renderMessages = () => {
    const rendered = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      
      // If we see an assistant message, we check if the NEXT message is a 'tool' message
      if (msg.role === 'assistant' && i + 1 < messages.length && messages[i + 1].role === 'tool') {
        const thought = msg.content;
        const toolRes = messages[i + 1].content;
        rendered.push(
          <ToolExecutionBlock 
            key={i} 
            thought={thought} 
            toolOutput={toolRes} 
          />
        );
        i += 2;
      } else {
        // Normal message, let's only render non-empty or user messages
        rendered.push(
          <ChatMessage key={i} message={msg} />
        );
        i++;
      }
    }
    return rendered;
  };

  return (
    <div className="chat-container">
      <header className="app-header">
        <h1>Agent AI</h1>
        <p>Intelligent assistant with MCP tool integration</p>
      </header>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="messages-list">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
              Send a message to start the conversation...
            </div>
          )}
          {renderMessages()}
          
          {isLoading && (
             <div className="message-box message-assistant" style={{ alignSelf: 'flex-start' }}>
               <div className="typing-indicator">
                 <div className="dot"></div>
                 <div className="dot"></div>
                 <div className="dot"></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area" style={{ padding: '0 1rem 1rem 1rem' }}>
          <div className="input-container">
            <textarea
              className="chat-textarea"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button 
              className="send-button"
              disabled={!input.trim() || isLoading}
              onClick={handleSubmit}
            >
              <PaperPlaneRight weight="fill" size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
