'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-black overflow-x-hidden">
      
      {/* Top Navbar */}
      <nav className="w-full border-b-[3px] border-black bg-[#fdfcee] px-6 py-4 flex items-center justify-between z-50">
        
        {/* Logo Area */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#3b82f6] border-[3px] border-black flex items-center justify-center font-bold text-white text-xl brutal-shadow">
            P
          </div>
          <span className="font-extrabold text-2xl tracking-wide uppercase">PROMPT402</span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center space-x-8 font-extrabold text-sm tracking-widest uppercase">
          <a href="#" className="hover:underline underline-offset-4">Architecture</a>
          <a href="#" className="hover:underline underline-offset-4">Features</a>
          <a href="#" className="hover:underline underline-offset-4">Security</a>
        </div>

        {/* Action Button (Moved Connect Wallet here) */}
        <div className="brutal-shadow brutal-border bg-[#111827] hover:bg-black transition-colors hidden sm:block">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                  className="h-full"
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} type="button" className="text-white font-bold px-6 py-3 text-sm uppercase tracking-wider">
                          Connect Wallet
                        </button>
                      );
                    }
                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button" className="text-white font-bold px-6 py-3 bg-red-600 text-sm">
                          Wrong Network
                        </button>
                      );
                    }
                    return (
                      <div className="flex h-full">
                        <button onClick={openChainModal} type="button" className="text-white font-bold px-4 border-r-2 border-white/20 hover:bg-white/10 hidden md:flex items-center justify-center">
                          {chain.hasIcon && (
                            <div style={{ background: chain.iconBackground, width: 16, height: 16, borderRadius: 999, overflow: 'hidden', marginRight: 6 }}>
                              {chain.iconUrl && <img alt={chain.name ?? 'Chain'} src={chain.iconUrl} style={{ width: 16, height: 16 }} />}
                            </div>
                          )}
                          {chain.name}
                        </button>
                        <button onClick={openAccountModal} type="button" className="text-white font-bold px-4 py-3 hover:bg-white/10 text-sm tracking-wider">
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 pt-20 pb-32">
        <div className="max-w-5xl w-full flex flex-col items-start space-y-6 relative">
          
          {/* Tags Row */}
          <div className="flex flex-wrap gap-4 text-xs tracking-wider font-mono font-extrabold uppercase mb-4">
            <span className="border-2 border-[#10b981] text-[#047857] px-3 py-1 bg-white brutal-shadow relative">
              SYS.BASE-SEPOLIA
            </span>
            <span className="border-2 border-[#3b82f6] text-[#1d4ed8] px-3 py-1 bg-white brutal-shadow relative">
              SYS.X402-PROTOCOL
            </span>
            <span className="border-2 border-[#8b5cf6] text-[#6d28d9] px-3 py-1 bg-white brutal-shadow relative">
              PROTO.HTTP-NATIVE
            </span>
          </div>

          {/* Hero Text */}
          <div className="flex flex-col space-y-3 w-full relative z-10 items-start">
            <h1 className="text-6xl md:text-[6.5rem] lg:text-[8rem] font-bold tracking-tight text-[#111827] leading-[0.9]">
              PROMPT402.
            </h1>

            <div className="relative inline-block brutal-shadow brutal-border bg-[#3b82f6] w-fit max-w-full transform -rotate-2 mt-4 ml-2">
              <h1 className="text-5xl md:text-[5.5rem] lg:text-[7rem] font-bold text-white px-6 pt-2 pb-4 tracking-tight leading-[0.9] m-0 break-words">
                PAY-AS-YOU PROMPT.
              </h1>
            </div>
          </div>

          {/* Detailed Explanation / Description */}
          <div className="mt-14 border-l-[4px] border-[#3b82f6] pl-6 max-w-2xl relative z-10 pt-2 pb-2">
            <p className="font-mono text-base md:text-lg leading-relaxed text-[#111827] font-semibold whitespace-pre-line">
              The x402 payment protocol seamlessly enforces on-chain spending caps for off-chain AI queries via cryptographic attestations.
              <br />
              <br />
              Making autonomous AI interactions safe, micro-priced, and fully trustless.
            </p>
          </div>

          {/* Interactive Action Area */}
          <div className="flex flex-col sm:flex-row gap-6 mt-16 w-full pt-8 z-10 mb-20">
            <a href="#" className="brutal-shadow brutal-border inline-block bg-[#111827] hover:bg-black transition-colors min-w-[220px]">
              <button className="text-white font-extrabold px-8 py-4 w-full h-full text-center text-md uppercase tracking-wide">
                Launch Demo
              </button>
            </a>

            <a href="#" className="brutal-shadow brutal-border inline-block bg-white hover:bg-[#f0f0f0] transition-colors min-w-[220px]">
              <button className="text-black font-extrabold px-8 py-4 w-full h-full text-center text-md uppercase tracking-wide">
                Read Documentation
              </button>
            </a>
          </div>
        </div>
      </main>

      {/* Powered By Banner */}
      <div className="w-full border-y-[3px] border-black bg-[#3b82f6] py-4 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 z-10 overflow-hidden">
        <span className="font-mono font-bold text-white tracking-widest text-sm uppercase">Powered By:</span>
        <div className="flex flex-wrap justify-center items-center gap-8 font-black text-xl italic text-white/90 uppercase tracking-widest">
          <span>BASE SEPOLIA</span>
          <span>•</span>
          <span>WAGMI</span>
          <span>•</span>
          <span>VIEM</span>
          <span>•</span>
          <span>COINBASE</span>
          <span>•</span>
          <span>X402 PROTO</span>
        </div>
      </div>

      {/* Features Grid Section */}
      <section className="w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center">
        <div className="w-full flex justify-between items-end mb-12 border-b-[3px] border-black pb-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
            [CORE STANDARDS] <br className="md:hidden" /> ENGINEERED FOR AI
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          {/* Card 1 */}
          <div className="brutal-border brutal-shadow bg-white p-6 flex flex-col space-y-4 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="w-12 h-12 bg-[#10b981] brutal-border flex items-center justify-center font-bold text-2xl text-white">402</div>
            <span className="font-mono text-xs font-bold bg-[#10b981]/20 text-[#047857] w-fit px-2 py-1 uppercase">Payment Rail</span>
            <h3 className="text-2xl font-black uppercase">HTTP 402 Standard</h3>
            <p className="font-mono text-sm leading-relaxed text-gray-700">Native "Payment Required" HTTP error interception allowing autonomous programmatic web interactions.</p>
          </div>

          {/* Card 2 */}
          <div className="brutal-border brutal-shadow bg-white p-6 flex flex-col space-y-4 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="w-12 h-12 bg-[#3b82f6] brutal-border flex items-center justify-center font-bold text-2xl text-white">⚙️</div>
            <span className="font-mono text-xs font-bold bg-[#3b82f6]/20 text-[#1d4ed8] w-fit px-2 py-1 uppercase">Off-Chain</span>
            <h3 className="text-2xl font-black uppercase">Gasless Validation</h3>
            <p className="font-mono text-sm leading-relaxed text-gray-700">Zero-gas overhead for evaluating deterministic prompt interactions before final settlement.</p>
          </div>

           {/* Card 3 */}
           <div className="brutal-border brutal-shadow bg-[#111827] text-white p-6 flex flex-col space-y-4 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(59,130,246,1)] transition-all">
            <div className="w-12 h-12 bg-white text-black brutal-border flex items-center justify-center font-bold text-2xl">🛡️</div>
            <span className="font-mono text-xs font-bold bg-white/20 text-white w-fit px-2 py-1 uppercase">Constraints</span>
            <h3 className="text-2xl font-black uppercase">Spending Policies</h3>
            <p className="font-mono text-sm leading-relaxed text-gray-300">Hardcoded on-chain budget maximums. Your wallet signs an allowance cap protecting against unbounded agent execution.</p>
          </div>
        </div>
      </section>

      {/* Brutalist Footer */}
      <footer className="w-full border-t-[3px] border-black bg-[#fdfcee] py-16 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          
          <div className="flex flex-col space-y-4 max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#3b82f6] border-[3px] border-black flex items-center justify-center font-bold text-white text-lg brutal-shadow">P</div>
              <span className="font-extrabold text-2xl tracking-wide uppercase">PROMPT402</span>
            </div>
            <div className="flex text-sm font-mono font-medium border-l-[3px] border-black pl-4">
              Making autonomous AI safe, micro-priced, and fully trustless.
            </div>
          </div>

          <div className="flex flex-wrap gap-16 font-mono text-sm font-bold uppercase tracking-wider">
            <div className="flex flex-col space-y-4">
              <span className="text-gray-500 mb-2">Resources</span>
              <a href="#" className="hover:underline hover:text-[#3b82f6]">Documentation</a>
              <a href="#" className="hover:underline hover:text-[#3b82f6]">GitHub</a>
              <a href="#" className="hover:underline hover:text-[#3b82f6]">x402 Spec</a>
            </div>
            <div className="flex flex-col space-y-4">
              <span className="text-gray-500 mb-2">Network</span>
              <a href="#" className="hover:underline text-[#10b981]">Base Sepolia [Test]</a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
