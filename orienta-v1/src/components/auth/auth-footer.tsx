export function AuthFooter() {
  return (
    <footer className="shrink-0 border-t border-white/15 bg-brand-900 px-5 py-5 text-center sm:px-8 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium leading-relaxed text-white">
          &copy; {new Date().getFullYear()}
          {" "}
          Controladoria-Geral do Estado do Rio Grande do Norte · Setor de Integridade
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/80">Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
