'use client';

import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useState, useRef, useEffect } from 'react';
import { useAccount, useSwitchChain, useSignMessage } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { Send, Bot, User, Loader2, Coins, ChevronDown, ArrowLeft, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

const MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isStreaming?: boolean;
  cost?: number;
  error?: boolean;
};

export default function ChatApp() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [balances, setBalances] = useState<{ spending_cap: string, current_balance: string } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isConnected && chain && chain.id !== baseSepolia.id && switchChain) {
      switchChain({ chainId: baseSepolia.id });
    }
    
    if (isConnected && address) {
      fetch(`${API_URL}/api/balance/${address}`)
        .then(res => res.json())
        .then(data => setBalances(data))
        .catch(e => console.error("Balance fetch failed", e));
    }
  }, [isConnected, chain, switchChain, address]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!input.trim() || !isConnected) {
        setEstimatedCost(null);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: selectedModel, prompt: input })
        });
        if (res.ok) {
          const data = await res.json();
          setEstimatedCost(data.max_cost);
        }
      } catch (e) {}
    }, 500);
    return () => clearTimeout(handler);
  }, [input, selectedModel, isConnected]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: input.trim() };
    const aiMsgId = uuidv4();
    setMessages((prev) => [...prev, userMsg, { id: aiMsgId, role: 'ai', content: '', isStreaming: true }]);
    setInput('');
    setIsGenerating(true);
    setEstimatedCost(null);

    let signature: string;
    try {
      const nonceMessage = `Prompt402 Login Verification\nWallet: ${address}\nRequest to model: ${selectedModel}`;
      signature = await signMessageAsync({ message: nonceMessage });
    } catch (err) {
      setMessages((prev) => prev.map(m => m.id === aiMsgId ? { ...m, content: 'Signature rejected. Execution cancelled.', isStreaming: false, error: true } : m));
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signature}`
        },
        body: JSON.stringify({
          wallet_address: address,
          model: selectedModel,
          prompt: userMsg.content,
          max_tokens: 500,
          stream: true
        })
      });

      if (res.status === 402) {
        throw new Error('HTTP 402: Payment Required. Insufficient smart contract spending allowance.');
      }
      if (!res.ok) {
        throw new Error('API Execution Failed.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) throw new Error(parsed.error);
                streamedContent += parsed.text;
                
                setMessages((prev) => 
                  prev.map(m => m.id === aiMsgId ? { ...m, content: streamedContent } : m)
                );
              } catch (e) {
                 // ignore mid-stream parse errors
              }
            }
          }
        }
      }

      setMessages((prev) => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => prev.map(m => m.id === aiMsgId ? { ...m, content: errorMessage, isStreaming: false, error: true } : m));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-black bg-[#fdfcee] selection:bg-[#3b82f6] selection:text-white">
      
      {/* ── Disclaimer Modal ───────────────────────────────────────────────── */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] bg-[#fdfcee]/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#fef08a] brutal-border brutal-shadow p-8 max-w-lg w-full flex flex-col space-y-6">
            <div className="flex items-center gap-3 text-yellow-700 mb-2">
              <AlertCircle size={32} />
              <h2 className="text-2xl font-black uppercase tracking-wider text-black">PAY-PER-PROMPT</h2>
            </div>
            <p className="font-mono text-sm leading-relaxed text-gray-800">
              Welcome to the <strong>Web3 natively-metered AI engine</strong>. 
              <br/><br/>
              Every prompt costs micro-cents in cryptographic funds strictly based on actual LLM token usage. Your wallet automatically limits spending bounds, ensuring you are <strong>never</strong> overcharged by the protocol.
            </p>
            <button 
              onClick={() => setShowDisclaimer(false)} 
              className="w-full bg-[#111827] text-white font-extrabold uppercase py-4 brutal-border brutal-shadow hover:bg-[#3b82f6] transition-colors"
            >
              I Understand, Start Chatting
            </button>
          </div>
        </div>
      )}

      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <nav className="w-full border-b-[3px] border-black bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between z-50 sticky top-0">
        <div className="flex items-center space-x-6 mb-4 sm:mb-0">
          <Link href="/" className="brutal-border hover:bg-black hover:text-white transition-colors p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#3b82f6] border-[3px] border-black flex items-center justify-center font-bold text-white text-lg brutal-shadow">P</div>
            <span className="font-extrabold text-xl tracking-wide uppercase">PROMPT402</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {balances && (
            <div className="hidden lg:flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-[#10b981] brutal-border bg-[#ecfdf5] px-3 py-1.5 brutal-shadow-sm">
              <Coins size={14} /> Bal: {parseFloat(balances.current_balance).toFixed(3)} / Cap: {parseFloat(balances.spending_cap).toFixed(1)} USDC
            </div>
          )}
          <div className="brutal-shadow brutal-border bg-[#111827] hover:bg-black transition-colors">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </nav>

      {/* ── Main Chat Area ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col relative">

        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 pointer-events-none">
            <Bot size={64} className="mb-6 opacity-40 text-[#3b82f6]" />
            <h1 className="text-4xl font-black uppercase tracking-tight mb-3">Welcome to Prompt402</h1>
            <p className="font-mono text-sm max-w-md leading-relaxed text-gray-700">Select your preferred AI model below and start chatting instantly using the deterministic x402 payment protocol.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pb-32">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                <div className={`w-10 h-10 shrink-0 brutal-border flex items-center justify-center brutal-shadow
                  ${msg.role === 'user' ? 'bg-[#3b82f6] text-white' : 'bg-[#10b981] text-white'}`}
                >
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>

                <div className={`px-5 py-4 font-mono text-sm leading-relaxed brutal-border brutal-shadow
                  ${msg.error ? 'bg-[#fca5a5] text-red-900 border-red-900' : 'bg-white'}
                `}>
                  {msg.content ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-wider text-xs">
                       <Loader2 className="animate-spin" size={16} /> Stream Engine Connect...
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

      </main>

      {/* ── Bottom Input Area ───────────────────────────────────────────────── */}
      <footer className="w-full bg-white border-t-[3px] border-black p-4 z-40 fixed bottom-0">
        <div className="max-w-5xl mx-auto relative">
          
          {estimatedCost !== null && estimatedCost > 0 && (
            <div className="absolute -top-12 right-0 bg-[#fef08a] border-[3px] border-black brutal-shadow px-3 py-1.5 flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-[#854d0e]">
              <Coins size={14} /> Est Max: ~{estimatedCost.toFixed(5)} USDC
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end bg-[#f8fafc] p-2 brutal-border brutal-shadow-sm focus-within:bg-white transition-colors">
            
            <div className="relative w-full sm:w-56 shrink-0 h-14">
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none w-full h-full brutal-border bg-[#e0e7ef] text-black font-bold uppercase tracking-wider text-xs px-4 outline-none hover:bg-[#cbd5e1] transition-colors cursor-pointer"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" size={16} />
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }}
              placeholder="Message AI... (Shift+Enter for newline)"
              disabled={isGenerating}
              className="flex-1 max-h-40 min-h-[56px] bg-transparent resize-none outline-none font-mono text-sm p-4 disabled:opacity-50"
              rows={1}
            />
            
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="w-14 h-14 shrink-0 bg-[#111827] text-white brutal-border brutal-shadow flex items-center justify-center hover:bg-[#3b82f6] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:bg-[#111827] disabled:hover:translate-y-0"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
            </button>
            
          </div>
        </div>
      </footer>

    </div>
  );
}
