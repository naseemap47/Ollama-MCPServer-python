import { useState } from 'react';
import { Wrench, CaretDown, CaretUp } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  thought: string;
  toolOutput: string;
}

export default function ToolExecutionBlock({ thought, toolOutput }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="message-row assistant">
      <div className="message-container">
         <div className="avatar tool">
            <Wrench size={20} weight="fill" color="#fff" />
         </div>
         <div className="message-content">
           <div className="tool-block">
             <div className="tool-header" onClick={() => setExpanded(!expanded)}>
               <span>Agent executed tool</span>
               <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                 {expanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
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
                       <div style={{ marginBottom: '1rem', color: '#ECECEC' }}>
                          <strong style={{ fontSize: '0.9rem' }}>Thought:</strong>
                          <div className="markdown-content" style={{ marginTop: '0.5rem' }}>
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{thought}</ReactMarkdown>
                          </div>
                       </div>
                     )}
                     <div>
                       <strong style={{ color: '#ECECEC', fontSize: '0.9rem' }}>Tool Output:</strong>
                       <pre style={{ margin: 0, marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#a78bfa', background: 'transparent', padding: 0, border: 'none' }}>
                         {toolOutput}
                       </pre>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
         </div>
      </div>
    </div>
  );
}
