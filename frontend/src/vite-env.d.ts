/// <reference types="vite/client" />

/**
 * Environment variables available in import.meta.env
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Extend Window interface to include MetaMask's ethereum provider
 * 
 * MetaMask injects window.ethereum when installed
 */
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, callback: (...args: any[]) => void) => void;
    removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
  };
}