'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0d0d11] text-gray-200 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-red-400">Erro Global</h2>
          <p className="text-xs text-gray-400 font-mono bg-black/40 p-3 rounded border border-red-500/20 break-all">
            {error.message || 'Erro crítico na aplicação'}
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
