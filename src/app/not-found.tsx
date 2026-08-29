import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d11] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold text-gray-100">Página Não Encontrada</h2>
        <p className="text-sm text-gray-400">O recurso solicitado não foi localizado.</p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          Retornar ao Início
        </Link>
      </div>
    </div>
  );
}
