'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d0d11] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold text-red-400">Ocorreu um erro no aplicativo</h2>
        <p className="text-xs text-gray-400 font-mono bg-black/40 p-3 rounded border border-red-500/20 break-all">
          {error.message || 'Erro inesperado'}
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
