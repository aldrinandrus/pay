import Link from "next/link";
import {
  QuestionMarkCircleIcon,
  ArrowDownTrayIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
// Use text labels for external links to avoid SVG import issues during prerender

const NavBar = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-4 relative z-20">
      <div className="flex gap-4 md:gap-8 justify-between sm:justify-end">
        <Link
          href="https://forms.gle/VZKvX93ifiew1ksW9"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <QuestionMarkCircleIcon className="w-4 h-4 mr-1" />
          Get In Touch
        </Link>
        <Link
          href="/x402.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
          One-pager
        </Link>
        <Link
          href="/x402_brand_kit.zip"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-1 text-sm"
        >
          <BriefcaseIcon className="w-4 h-4 mr-1" />
          Brand kit
        </Link>
        <Link
          href="https://github.com/coinbase/x402"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
        >
          GitHub
        </Link>
        <Link
          href="https://discord.gg/invite/cdp"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
        >
          Discord
        </Link>
      </div>
    </section>
  );
};

export default NavBar;
