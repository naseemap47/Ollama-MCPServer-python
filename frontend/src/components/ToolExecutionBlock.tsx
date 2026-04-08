import { useState } from 'react';
import { Wrench, CaretDown, CaretUp } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  thought: string;
  toolOutput: string;
}

export default function ToolExecutionBlock({ thought, toolOutput }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: '50%', 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Wrench size={16} weight="duotone" color="#94a3b8" />
      </div>
      
      <div className="tool-block">
        <div className="tool-header" onClick={() => setExpanded(!expanded)}>
          <span>Agent executing a tool</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </span>
        </div>
        
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="tool-details">
                {thought && (
                  <div style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
                     <strong>Thought:</strong>
                     <div className="markdown-content" style={{ marginTop: '4px' }}>
                        <ReactMarkdown>{thought}</ReactMarkdown>
                     </div>
                  </div>
                )}
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Tool Output:</strong>
                  <pre style={{ margin: 0, marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#a78bfa', background: 'transparent' }}>
                    {toolOutput}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
