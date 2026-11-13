export const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8M8 9h8M8 15h5" />
      </svg>
    </div>
    <span className="text-lg font-medium">SMART <span className="text-brand">RECRUITMENT</span></span>
  </div>
);

export const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-xs text-muted ${className}`}>
    {children}
  </span>
);

const TITLES = ["Créer votre offre d’emploi", "Importer les CV", "Analyser et comparer"];

export const Header = ({ step }) => (
  <header className="border-b border-line bg-white">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Logo />
      <Pill className="hidden sm:inline-flex">Étape {step} sur 3 — {TITLES[step - 1]}</Pill>
    </div>
  </header>
);

export function Stepper({ current }) {
  const subs = ["Étape en cours", "Documents PDF", "Scores et classement"];
  return (
    <ol className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:gap-6">
      {TITLES.map((title, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const sub = done ? "Terminée" : active ? "Étape en cours" : n === 3 ? "À venir" : subs[i];
        return (
          <li key={title} className="flex flex-1 items-center gap-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${done || active ? "bg-brand-soft text-brand" : "bg-page text-muted"}`}>
              {done ? "✓" : n}
            </span>
            <span>
              <span className={`block text-sm font-medium ${done || active ? "text-brand" : "text-muted"}`}>{title}</span>
              <span className="block text-xs text-muted">{sub}</span>
            </span>
            {n < 3 && <span className="ml-auto hidden h-px flex-1 bg-line sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

export const PageTitle = ({ title, subtitle, badge }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-3xl font-normal">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
    </div>
    <Pill>{badge}</Pill>
  </div>
);

export const Card = ({ children }) => (
  <section className="rounded-xl border border-line bg-white p-6 sm:p-8">{children}</section>
);

export const Button = ({ variant = "primary", className = "", ...p }) => (
  <button
    {...p}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${
      variant === "primary" ? "bg-brand text-white hover:bg-brand-dark" : "border border-line bg-white hover:bg-page"
    } ${className}`}
  />
);
