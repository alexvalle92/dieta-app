'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-3.536 5 5 0 011.414-3.536m0 7.072L5.636 18.364M8.464 8.464L5.636 5.636m0 12.728a9 9 0 010-12.728"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Sem conexão
        </h1>
        <p className="text-muted-foreground mb-8">
          Parece que você está offline. Verifique sua conexão com a internet e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
