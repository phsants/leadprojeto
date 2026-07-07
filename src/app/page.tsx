import LeadForm from "@/components/LeadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-ink-50 to-ink-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Pré-avaliação de interesse
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-500">
            Queremos entender melhor o seu interesse para direcionar seu atendimento da forma mais adequada.
            Este formulário é rápido e serve apenas para organizar o primeiro contato com a equipe. Ele{" "}
            <strong className="text-ink-700">não substitui consulta médica</strong>, não define indicação
            cirúrgica e não fornece orçamento definitivo.
          </p>
        </header>

        <LeadForm />

        <footer className="mt-8 text-center text-xs text-ink-400">
          Suas informações são usadas apenas para organizar o atendimento inicial.
        </footer>
      </div>
    </main>
  );
}
