import { useState } from "react";
import { Logo, Button, Card, Pill } from "./components/ui.jsx";
import JobStep from "./steps/JobStep.jsx";
import ImportStep from "./steps/ImportStep.jsx";
import ResultsStep from "./steps/ResultsStep.jsx";
import {
  createOffre,
  uploadCvs,
  getCvsByOffre,
} from "./lib/api.js";

const EMPTY_JOB = {
  title: "",
  description: "",
  skills: [],
  experience: "2 ans",
  education: "Bac +3",
};

const read = (k, d = []) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};

const write = (k, v) =>
  localStorage.setItem(k, JSON.stringify(v));

/* ---------- Animations ----------
   Keyframes live here once and are used by every page/step through
   Tailwind arbitrary values, e.g. animate-[srRise_.5s_ease-out_both].
   No tailwind.config change needed. */
const RISE = "animate-[srRise_.55s_cubic-bezier(.2,.7,.2,1)_both]";
const POP = "animate-[srPop_.35s_cubic-bezier(.2,.9,.3,1.2)_both]";
const FADE = "animate-[srFade_.35s_ease-out_both]";

function GlobalStyles() {
  return (
    <style>{`
      @keyframes srRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      @keyframes srFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes srPop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
      @keyframes srBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes srBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes srScan { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
      @keyframes srSlide { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
      @keyframes srFloat { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px,-18px); } }
      html { scroll-behavior: smooth; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  );
}

const Icon = ({ name }) => {
  const paths = {
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 6-7" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.file}
    </svg>
  );
};

function Field({ label, ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        {...props}
        className="mt-2 w-full rounded-lg border border-line bg-white px-4 py-3 font-normal outline-none transition duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-brand/20 disabled:bg-page disabled:text-muted"
      />
    </label>
  );
}

/* Sidebar navigation item shared by both spaces */
function NavItem({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-lg px-3 py-2.5 text-left text-sm transition duration-200 ${
        active
          ? "bg-brand-soft font-semibold text-brand"
          : "text-muted hover:translate-x-1 hover:bg-page"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand transition-all duration-300 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      {children}
    </button>
  );
}

function Auth({ role, mode, onDone, onMode, onBack }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const candidate = role === "candidate";

  function submit(e) {
    e.preventDefault();

    if (!email.includes("@") || password.length < 6) {
      setError(
        "Adresse e-mail invalide ou mot de passe trop court (6 caractères minimum)."
      );
      return;
    }

    const users = read("sr_users", []);

    let user = users.find(
      (x) =>
        x.email.toLowerCase() === email.toLowerCase() &&
        x.role === role
    );

    if (mode === "register") {
      if (
        users.some(
          (x) =>
            x.email.toLowerCase() === email.toLowerCase() &&
            x.role === role
        )
      ) {
        setError("Ce compte existe déjà.");
        return;
      }

      user = { id: Date.now(), name, email, company, role };
      write("sr_users", [...users, user]);
    } else if (!user) {
      setError("Compte introuvable. Créez un compte pour continuer.");
      return;
    }

    write("sr_session", user);
    onDone(user);
  }

  return (
    <main className={`mx-auto max-w-lg px-6 py-12 ${RISE}`}>
      <button
        onClick={onBack}
        className="group mb-7 text-sm text-muted transition hover:text-brand"
      >
        <span className="inline-block transition group-hover:-translate-x-1">
          ←
        </span>{" "}
        Retour à l’accueil
      </button>

      <Card>
        <div className="mb-6">
          <Pill>
            {candidate ? "Portail Candidat" : "Espace Recruteur"}
          </Pill>

          <h1 className="mt-4 text-2xl font-semibold">
            {mode === "login"
              ? "Heureux de vous revoir"
              : "Créer votre compte"}
          </h1>

          <p className="mt-2 text-sm text-muted">
            {mode === "login"
              ? "Connectez-vous à votre espace sécurisé."
              : "Rejoignez SMART RECRUITMENT."}
          </p>
        </div>

        {/* key restarts the entrance when switching login/register */}
        <form
          key={mode}
          className={`space-y-4 ${FADE}`}
          onSubmit={submit}
        >
          {mode === "register" && (
            <>
              <Field
                label="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Votre nom"
              />

              {!candidate && (
                <Field
                  label="Entreprise"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  placeholder="Nom de l’entreprise"
                />
              )}
            </>
          )}

          <Field
            label="Adresse e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nom@exemple.com"
          />

          <Field
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="6 caractères minimum"
          />

          {error && (
            <p
              role="alert"
              className={`rounded-lg bg-red-50 p-3 text-sm text-red-600 ${POP}`}
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            {mode === "login" ? "Se connecter" : "Créer mon compte"} →
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login"
            ? "Pas encore de compte ?"
            : "Vous avez déjà un compte ?"}{" "}
          <button
            className="font-medium text-brand hover:underline"
            onClick={() =>
              onMode(mode === "login" ? "register" : "login")
            }
          >
            {mode === "login" ? "S’inscrire" : "Se connecter"}
          </button>
        </p>

        <p className="mt-5 text-xs text-muted">
          Prototype : authentification de démonstration stockée localement.
          À connecter à une authentification backend avant mise en production.
        </p>
      </Card>
    </main>
  );
}

function Home({ go }) {
  return (
    <main className="relative mx-auto max-w-6xl px-6 py-14">
      {/* Soft decorative glow, brand colour only */}
      <div className="pointer-events-none absolute -top-10 right-0 -z-10 h-72 w-72 animate-[srFloat_9s_ease-in-out_infinite] rounded-full bg-brand-soft blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-64 -z-10 h-56 w-56 animate-[srFloat_11s_ease-in-out_infinite] rounded-full bg-brand-soft/70 blur-3xl" />

      <div className="max-w-3xl">
        <div className={RISE}>
          <Pill>La rencontre entre talents et opportunités</Pill>
        </div>

        <h1
          className={`mt-6 text-4xl font-semibold leading-tight sm:text-5xl ${RISE}`}
          style={{ animationDelay: "90ms" }}
        >
          Le recrutement devient{" "}
          <span className="text-brand">plus intelligent.</span>
        </h1>

        <p
          className={`mt-5 max-w-2xl text-base leading-7 text-muted ${RISE}`}
          style={{ animationDelay: "180ms" }}
        >
          Une plateforme unique pour publier des offres, découvrir des talents
          et faire correspondre les compétences aux bons postes.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {[
          {
            id: "recruiter",
            title: "Espace Recruteur",
            desc: "Publiez vos offres, gérez vos candidatures et identifiez les meilleurs profils grâce au matching intelligent.",
            icon: "briefcase",
            tag: "Pilotez vos recrutements",
            action: "Accéder à l’espace recruteur",
          },
          {
            id: "candidate",
            title: "Portail Candidat",
            desc: "Créez votre profil, explorez les opportunités et postulez en quelques étapes avec votre CV PDF.",
            icon: "user",
            tag: "Donnez de l’élan à votre carrière",
            action: "Accéder au portail candidat",
          },
        ].map((x, i) => (
          <button
            key={x.id}
            onClick={() => go(x.id)}
            style={{ animationDelay: `${280 + i * 110}ms` }}
            className={`group relative overflow-hidden rounded-2xl border border-line bg-white p-8 text-left transition duration-300 hover:-translate-y-1.5 hover:border-brand hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${RISE}`}
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-soft opacity-0 transition duration-500 group-hover:scale-150 group-hover:opacity-100" />

            <div className="relative flex items-center justify-between">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
                <Icon name={x.icon} />
              </span>
              <span className="text-brand transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
                ↗
              </span>
            </div>

            <p className="relative mt-7 text-xs font-semibold uppercase tracking-wider text-brand">
              {x.tag}
            </p>

            <h2 className="relative mt-2 text-2xl font-semibold">
              {x.title}
            </h2>

            <p className="relative mt-3 min-h-14 text-sm leading-6 text-muted">
              {x.desc}
            </p>

            <span className="relative mt-7 inline-flex rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white transition duration-300 group-hover:shadow-lg">
              {x.action}
              <span className="ml-1 inline-block transition duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-12 grid gap-4 rounded-2xl bg-brand-soft p-7 sm:grid-cols-3">
        {[
          ["01", "Publier ou Choisir", "Offres enregistrées sur l'API ou création sur mesure"],
          ["02", "Importer", "Dépôt des CV au format PDF"],
          ["03", "Matcher", "Classement transparent des compétences"],
        ].map((x, i) => (
          <div
            key={x[0]}
            style={{ animationDelay: `${520 + i * 100}ms` }}
            className={`rounded-xl p-3 transition duration-300 hover:bg-white/60 ${RISE}`}
          >
            <span className="text-xs font-semibold text-brand">
              {x[0]}
            </span>
            <h3 className="mt-2 font-semibold">{x[1]}</h3>
            <p className="mt-1 text-sm text-muted">{x[2]}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function Workspace({ user, onLogout, offers, setOffers, onLaunchWizard }) {
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    skills: "",
    experience: "2 ans",
    education: "Bac +3",
  });

  const [notice, setNotice] = useState("");

  const applications = read("sr_applications", []);
  const owned = offers.filter((o) => o.owner === user.email);

  function save(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) return;

    const next = {
      ...form,
      id: editing || Date.now(),
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      owner: user.email,
      createdAt: new Date().toISOString(),
    };

    setOffers((old) => {
      const n = editing
        ? old.map((o) => (o.id === editing ? next : o))
        : [next, ...old];

      write("sr_offers", n);
      return n;
    });

    setEditing(null);

    setForm({
      title: "",
      description: "",
      skills: "",
      experience: "2 ans",
      education: "Bac +3",
    });

    setTab("offers");
    setNotice("Offre enregistrée.");
  }

  function edit(o) {
    setEditing(o.id);
    setForm({ ...o, skills: o.skills.join(", ") });
    setTab("create");
  }

  function remove(id) {
    if (confirm("Supprimer cette offre ?")) {
      setOffers((old) => {
        const n = old.filter((o) => o.id !== id);
        write("sr_offers", n);
        return n;
      });
    }
  }

  return (
    <div
      className={`mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[230px_1fr] ${FADE}`}
    >
      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24">
        <p className="text-xs uppercase tracking-wider text-muted">
          Recruteur
        </p>

        <h2 className="mt-2 font-semibold">
          {user.company || user.name}
        </h2>

        <nav className="mt-7 space-y-1">
          {[
            ["overview", "Vue d’ensemble"],
            ["offers", "Mes offres"],
            ["candidates", "Candidats"],
            ["create", "Créer une offre"],
            ["matching", "Matching CV"],
          ].map(([id, label]) => (
            <NavItem
              key={id}
              active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </NavItem>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="mt-8 w-full border-t border-line pt-4 text-left text-sm text-muted transition hover:text-red-600"
        >
          Déconnexion ↗
        </button>
      </aside>

      <section className="min-w-0">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              Bonjour, {user.name || user.company}
            </p>

            <h1 key={tab} className={`mt-1 text-2xl font-semibold ${RISE}`}>
              {
                {
                  overview: "Tableau de bord",
                  offers: "Mes offres d’emploi",
                  candidates: "Candidats",
                  create: editing ? "Modifier l’offre" : "Nouvelle offre",
                  matching: "Matching intelligent",
                }[tab]
              }
            </h1>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                title: "",
                description: "",
                skills: "",
                experience: "2 ans",
                education: "Bac +3",
              });
              setTab("create");
            }}
          >
            ＋ Nouvelle offre
          </Button>
        </div>

        {notice && (
          <p
            className={`mb-4 flex items-center justify-between rounded-lg bg-brand-soft p-3 text-sm text-brand ${POP}`}
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Fermer"
              className="ml-3 text-brand/70 transition hover:text-brand"
            >
              ✕
            </button>
          </p>
        )}

        {/* key restarts the entrance on every tab change */}
        <div key={tab} className={`space-y-6 ${RISE}`}>
          {tab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Offres actives", owned.length],
                  [
                    "Candidatures reçues",
                    applications.filter((a) =>
                      owned.some((o) => o.id === a.offerId)
                    ).length,
                  ],
                  [
                    "Profils à examiner",
                    applications.filter((a) =>
                      owned.some((o) => o.id === a.offerId)
                    ).length,
                  ],
                ].map((x, i) => (
                  <div
                    key={x[0]}
                    style={{ animationDelay: `${i * 80}ms` }}
                    className={`transition duration-300 hover:-translate-y-1 ${RISE}`}
                  >
                    <Card>
                      <p className="text-sm text-muted">{x[0]}</p>
                      <p className="mt-3 text-3xl font-semibold">{x[1]}</p>
                    </Card>
                  </div>
                ))}
              </div>

              <Card>
                <h3 className="font-semibold">Démarrer un recrutement</h3>
                <p className="mt-2 text-sm text-muted">
                  Créez une offre, recevez des candidatures et analysez les CV.
                </p>
                <Button className="mt-5" onClick={() => setTab("create")}>
                  Créer ma première offre →
                </Button>
              </Card>
            </>
          )}

          {tab === "create" && (
            <Card>
              <form onSubmit={save} className="space-y-4">
                <Field
                  label="Intitulé du poste"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                  placeholder="Ex. Développeur Full Stack"
                />

                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    required
                    rows="4"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-line p-3 font-normal outline-none transition duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </label>

                <Field
                  label="Compétences (séparées par des virgules)"
                  value={form.skills}
                  onChange={(e) =>
                    setForm({ ...form, skills: e.target.value })
                  }
                  placeholder="React, Python, SQL"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Expérience
                    <select
                      value={form.experience}
                      onChange={(e) =>
                        setForm({ ...form, experience: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-line p-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    >
                      <option>Débutant</option>
                      <option>1 an</option>
                      <option>2 ans</option>
                      <option>3 ans</option>
                      <option>5 ans</option>
                      <option>8 ans et plus</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Niveau d’études
                    <select
                      value={form.education}
                      onChange={(e) =>
                        setForm({ ...form, education: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-line p-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    >
                      <option>Bac</option>
                      <option>Bac +2</option>
                      <option>Bac +3</option>
                      <option>Bac +5</option>
                      <option>Doctorat</option>
                    </select>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button type="submit">
                    {editing
                      ? "Enregistrer les modifications"
                      : "Publier l’offre"}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTab("offers")}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {tab === "offers" && (
            <Card>
              <div className="mb-4 flex justify-between">
                <h3 className="font-semibold">Offres publiées</h3>
                <Pill>{owned.length} offre(s)</Pill>
              </div>

              {owned.length === 0 ? (
                <p className="text-sm text-muted">
                  Aucune offre publiée pour le moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {owned.map((o, i) => (
                    <div
                      key={o.id}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border border-line p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md ${RISE}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{o.title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {o.skills.join(" · ") ||
                            "Compétences non précisées"}
                        </p>
                      </div>

                      <Pill>Publiée</Pill>

                      <button
                        onClick={() => edit(o)}
                        className="text-sm text-brand transition hover:underline"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => remove(o.id)}
                        className="text-sm text-red-600 transition hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "candidates" && (
            <Card>
              <h3 className="mb-4 font-semibold">Candidatures reçues</h3>

              {applications.filter((a) =>
                owned.some((o) => o.id === a.offerId)
              ).length === 0 ? (
                <p className="text-sm text-muted">
                  Aucune candidature reçue. Vos offres seront visibles dans le
                  Portail Candidat.
                </p>
              ) : (
                applications
                  .filter((a) =>
                    owned.some((o) => o.id === a.offerId)
                  )
                  .map((a, i) => (
                    <div
                      key={a.id}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className={`border-b border-line py-4 transition hover:bg-page/60 ${RISE}`}
                    >
                      <p className="font-medium">{a.candidateName}</p>
                      <p className="text-sm text-muted">
                        {a.offerTitle} · {a.email}
                      </p>
                      <p className="text-xs text-muted">{a.cvName}</p>
                    </div>
                  ))
              )}
            </Card>
          )}

          {tab === "matching" && (
            <Card>
              <h3 className="font-semibold">Analyse et matching CV</h3>

              <p className="mt-2 text-sm text-muted">
                Sélectionnez une offre existante parmi celles enregistrées dans
                votre API ou créez une nouvelle offre, puis importez les CV PDF
                pour obtenir un classement précis.
              </p>

              <Button className="mt-5" onClick={onLaunchWizard}>
                Ouvrir le parcours d’analyse →
              </Button>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function CandidatePortal({ user, onLogout, offers }) {
  const [tab, setTab] = useState("offers");

  const [profile, setProfile] = useState(() =>
    read("sr_profile_" + user.email, {
      phone: "",
      city: "",
      education: "",
      headline: "",
    })
  );

  const [selected, setSelected] = useState("");
  const [cv, setCv] = useState(null);
  const [msg, setMsg] = useState("");

  const applications = read("sr_applications", []);
  const mine = applications.filter((a) => a.email === user.email);

  function saveProfile(e) {
    e.preventDefault();
    write("sr_profile_" + user.email, profile);
    setMsg("Profil enregistré.");
  }

  function apply(e) {
    e.preventDefault();

    const offer = offers.find(
      (o) => String(o.id) === String(selected)
    );

    if (!offer || !cv) return;

    const all = read("sr_applications", []);

    all.unshift({
      id: Date.now(),
      offerId: offer.id,
      offerTitle: offer.title,
      candidateName: user.name,
      email: user.email,
      cvName: cv.name,
      submittedAt: new Date().toISOString(),
    });

    write("sr_applications", all);

    setMsg("Votre candidature a été enregistrée.");
    setCv(null);
    setTab("applications");
  }

  return (
    <div
      className={`mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[230px_1fr] ${FADE}`}
    >
      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24">
        <p className="text-xs uppercase tracking-wider text-muted">
          Candidat
        </p>

        <h2 className="mt-2 font-semibold">{user.name}</h2>

        <nav className="mt-7 space-y-1">
          {[
            ["offers", "Offres disponibles"],
            ["profile", "Mon profil"],
            ["applications", "Mes candidatures"],
          ].map(([id, label]) => (
            <NavItem
              key={id}
              active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </NavItem>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="mt-8 w-full border-t border-line pt-4 text-left text-sm text-muted transition hover:text-red-600"
        >
          Déconnexion ↗
        </button>
      </aside>

      <section>
        <div className="mb-7">
          <p className="text-sm text-muted">
            Bienvenue sur votre espace
          </p>

          <h1 key={tab} className={`mt-1 text-2xl font-semibold ${RISE}`}>
            {tab === "offers"
              ? "Explorez les opportunités"
              : tab === "profile"
                ? "Mon profil candidat"
                : tab === "apply"
                  ? "Déposer ma candidature"
                  : "Mes candidatures"}
          </h1>
        </div>

        {msg && (
          <p
            className={`mb-4 flex items-center justify-between rounded-lg bg-brand-soft p-3 text-sm text-brand ${POP}`}
          >
            <span>{msg}</span>
            <button
              onClick={() => setMsg("")}
              aria-label="Fermer"
              className="ml-3 text-brand/70 transition hover:text-brand"
            >
              ✕
            </button>
          </p>
        )}

        <div key={tab} className={RISE}>
          {tab === "offers" && (
            <div className="space-y-4">
              {offers.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted">
                    Aucune offre publiée pour le moment. Revenez bientôt.
                  </p>
                </Card>
              ) : (
                offers.map((o, i) => (
                  <div
                    key={o.id}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className={`transition duration-300 hover:-translate-y-1 ${RISE}`}
                  >
                    <Card>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Pill>Offre ouverte</Pill>
                          <h3 className="mt-3 text-lg font-semibold">
                            {o.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted">
                            {o.owner}
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            setSelected(String(o.id));
                            setTab("apply");
                          }}
                        >
                          Postuler →
                        </Button>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-muted">
                        {o.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {o.skills.map((s) => (
                          <Pill key={s}>{s}</Pill>
                        ))}
                      </div>

                      <p className="mt-4 text-xs text-muted">
                        {o.experience} d’expérience · {o.education}
                      </p>
                    </Card>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "profile" && (
            <Card>
              <form onSubmit={saveProfile} className="space-y-4">
                <Field label="Nom complet" value={user.name} disabled />
                <Field label="E-mail" value={user.email} disabled />

                <Field
                  label="Téléphone"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder="+212 ..."
                />

                <Field
                  label="Ville"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value })
                  }
                  placeholder="Casablanca"
                />

                <Field
                  label="Intitulé du profil"
                  value={profile.headline}
                  onChange={(e) =>
                    setProfile({ ...profile, headline: e.target.value })
                  }
                  placeholder="Développeur Full Stack"
                />

                <Field
                  label="Niveau d’études"
                  value={profile.education}
                  onChange={(e) =>
                    setProfile({ ...profile, education: e.target.value })
                  }
                  placeholder="Bac +5"
                />

                <Button type="submit">Enregistrer mon profil</Button>
              </form>
            </Card>
          )}

          {tab === "apply" && (
            <Card>
              <h3 className="font-semibold">Déposer ma candidature</h3>

              <p className="mt-2 text-sm text-muted">
                Offre : {offers.find((o) => String(o.id) === selected)?.title}
              </p>

              <form onSubmit={apply} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  CV au format PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    required
                    onChange={(e) => setCv(e.target.files?.[0] || null)}
                    className="mt-2 block w-full rounded-lg border border-dashed border-line p-3 text-sm transition hover:border-brand file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:text-brand"
                  />
                </label>

                {cv && (
                  <p className={`text-xs text-muted ${POP}`}>
                    Document sélectionné : {cv.name}
                  </p>
                )}

                <p className="text-xs text-muted">
                  Prototype : le fichier est sélectionné dans le navigateur,
                  mais son stockage sécurisé et son transfert vers le
                  recruteur nécessitent l’API de candidature.
                </p>

                <div className="flex gap-3">
                  <Button type="submit" disabled={!cv}>
                    Envoyer ma candidature →
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTab("offers")}
                  >
                    Retour
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {tab === "applications" && (
            <Card>
              <h3 className="mb-4 font-semibold">
                Historique des candidatures
              </h3>

              {mine.length === 0 ? (
                <p className="text-sm text-muted">
                  Vous n’avez pas encore postulé.
                </p>
              ) : (
                mine.map((a, i) => (
                  <div
                    key={a.id}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`flex items-center justify-between border-b border-line py-4 ${RISE}`}
                  >
                    <div>
                      <p className="font-medium">{a.offerTitle}</p>
                      <p className="text-xs text-muted">{a.cvName}</p>
                    </div>

                    <Pill>Reçue</Pill>
                  </div>
                ))
              )}
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("home");
  const [authMode, setAuthMode] = useState("login");

  const [session, setSession] = useState(() =>
    read("sr_session", null)
  );

  const [offers, setOffersState] = useState(() =>
    read("sr_offers", [])
  );

  const [step, setStep] = useState(1);
  const [job, setJob] = useState(EMPTY_JOB);
  const [saved, setSaved] = useState(false);
  const [files, setFiles] = useState([]);
  const [offreId, setOffreId] = useState(null);

  const [uploadResult, setUploadResult] = useState(null);
  const [candidates, setCandidates] = useState([]);

  const [lastUploadKey, setLastUploadKey] = useState(null);

  const [loading, setLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [error, setError] = useState("");

  const setOffers = (fn) => setOffersState(fn);

  const startAuth = (r, m = "login") => {
    setRoute(r + "_auth");
    setAuthMode(m);
  };

  const logout = () => {
    localStorage.removeItem("sr_session");
    setSession(null);
    setRoute("home");
  };

  // Select an existing job offer from the API.
  const selectExistingJob = (selectedJob) => {
    setJob(selectedJob);
    setOffreId(selectedJob.id);
    setSaved(true);

    setLastUploadKey(null);
    setUploadResult(null);
    setCandidates([]);
    setFiles([]);

    setError("");
    setStep(2);
  };

  // Create a new job offer through the API.
  const saveJob = async (j) => {
    setLoading(true);
    setProcessingMessage("Enregistrement de l’offre...");
    setError("");

    try {
      const o = await createOffre(j);

      setJob({ ...j, id: o.id });
      setOffreId(o.id);
      setSaved(true);

      setLastUploadKey(null);
      setUploadResult(null);
      setCandidates([]);
      setFiles([]);

      setStep(2);
    } catch (e) {
      setError(e.message || "Impossible d’enregistrer l’offre.");
    } finally {
      setLoading(false);
      setProcessingMessage("");
    }
  };

  // Convert one backend CV object into the frontend candidate format.
  const formatCandidate = (cv) => ({
    id: cv.id,

    name:
      cv.nom_candidat ||
      cv.nom_fichier ||
      "Candidat inconnu",

    headline:
      cv.poste ||
      cv.profil ||
      "Profil non renseigné",

    years: Number(cv.annees_experience) || 0,
    score: Number(cv.score) || 0,

    email: cv.email || "",
    telephone: cv.telephone || "",
    profile: cv.profil || "",
    experience: cv.experience_texte || "",
    education: cv.niveau_etudes || "",
    formations: cv.formations || [],

    skills: cv.competences || [],
    transversalSkills: cv.competences_transversales || [],
    matchingSkills: cv.matching_skills || [],
    missingSkills: cv.missing_skills || [],

    category: cv.categorie || "",
    experienceMatch: cv.experience_match,
    educationMatch: cv.education_match,
    justification: cv.justification || "",

    status: cv.statut || "",
    filename: cv.nom_fichier || "",
    message: cv.message || "",
  });

  // Upload CVs, wait for backend processing, then retrieve the results.
  const sendCvs = async () => {
    if (loading) return;

    if (!offreId) {
      setError("Aucune offre sélectionnée. Veuillez sélectionner une offre.");
      return;
    }

    if (!files.length) {
      setError("Veuillez importer au moins un CV PDF.");
      return;
    }

    const key = `${offreId}|${files
      .map((f) => `${f.name}:${f.size}`)
      .join(",")}`;

    // If these files have already been processed, reuse the results.
    if (key === lastUploadKey && candidates.length > 0) {
      setError("");
      setStep(3);
      return;
    }

    setLoading(true);
    setError("");
    setCandidates([]);
    setUploadResult(null);

    try {
      // STEP 1: Upload the PDF files.
      // The backend performs extraction and Gemini matching during this request.
      setProcessingMessage(
        "Envoi des CV et démarrage de l’analyse intelligente..."
      );

      const uploadResponse = await uploadCvs(offreId, files);

      setUploadResult(uploadResponse);

      // STEP 2: The POST request has completed.
      // Now retrieve the final analysis results.
      setProcessingMessage("Récupération des résultats de l’analyse...");

      const response = await getCvsByOffre(offreId);

      // Your backend currently returns a direct array.
      // The other formats are supported as a fallback.
      const cvs = Array.isArray(response)
        ? response
        : response?.cvs ||
          response?.resultats ||
          response?.items ||
          [];

      if (!Array.isArray(cvs)) {
        throw new Error(
          "Le format des résultats retournés par le serveur est invalide."
        );
      }

      // STEP 3: Convert backend fields into frontend candidate objects.
      const formattedCandidates = cvs
        .map(formatCandidate)
        .sort((a, b) => b.score - a.score);

      // STEP 4: Save the results and navigate to the results page.
      setCandidates(formattedCandidates);
      setLastUploadKey(key);
      setStep(3);
    } catch (e) {
      console.error("CV analysis error:", e);

      setError(
        e.message ||
          "Une erreur est survenue pendant l’analyse des CV."
      );
    } finally {
      setLoading(false);
      setProcessingMessage("");
    }
  };

  const wizard = route === "wizard";

  return (
    <>
      <GlobalStyles />

      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={() => setRoute("home")}
            className="cursor-pointer transition duration-200 hover:scale-[1.03] active:scale-95"
          >
            <Logo />
          </button>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <button
                  className={`text-sm transition ${
                    route === session.role
                      ? "font-semibold text-brand"
                      : "text-muted hover:text-brand"
                  }`}
                  onClick={() => setRoute(session.role)}
                >
                  {session.role === "recruiter"
                    ? "Mon Espace"
                    : "Mon Portail"}
                </button>

                <span className="hidden text-sm text-muted sm:block">
                  {session.name}
                </span>

                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={logout}
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                className="text-sm text-brand transition hover:underline"
                onClick={() => setRoute("home")}
              >
                Accueil
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <p
            role="alert"
            className={`flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 ${POP}`}
          >
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              aria-label="Fermer"
              className="ml-3 text-red-400 transition hover:text-red-700"
            >
              ✕
            </button>
          </p>
        </div>
      )}

      {/* Loading animation */}
      {loading && (
        <div className={`mx-auto mt-6 max-w-6xl px-4 ${POP}`}>
          <div className="overflow-hidden rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft">
                <div className="absolute inset-0 animate-ping rounded-full bg-brand/20" />

                <svg
                  className="relative h-6 w-6 animate-spin text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">
                  {processingMessage.includes("Enregistrement")
                    ? "Enregistrement de l’offre"
                    : "Analyse intelligente en cours"}
                </h3>

                {/* key restarts the fade each time the message changes */}
                <p
                  key={processingMessage}
                  className={`mt-1 text-sm text-muted ${FADE}`}
                >
                  {processingMessage || "Veuillez patienter..."}
                </p>
              </div>
            </div>

            <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-page">
              <div className="absolute inset-y-0 left-0 w-1/3 animate-[srSlide_1.4s_ease-in-out_infinite] rounded-full bg-brand" />
            </div>

            <p className="mt-3 text-xs text-muted">
              {processingMessage.includes("Enregistrement")
                ? "Votre offre est en cours d’enregistrement."
                : "Extraction des données, analyse des compétences et comparaison avec l’offre. Cette opération peut prendre quelques instants."}
            </p>
          </div>
        </div>
      )}

      {route === "home" && (
        <Home
          go={(r) => {
            if (r === "wizard") {
              setStep(1);
              setRoute("wizard");
            } else if (session?.role === r) {
              setRoute(r);
            } else {
              startAuth(r);
            }
          }}
        />
      )}

      {(route === "recruiter_auth" ||
        route === "candidate_auth") && (
        <Auth
          role={
            route === "candidate_auth"
              ? "candidate"
              : "recruiter"
          }
          mode={authMode}
          onMode={setAuthMode}
          onBack={() => setRoute("home")}
          onDone={(u) => {
            setSession(u);
            setRoute(
              u.role === "candidate" ? "candidate" : "recruiter"
            );
          }}
        />
      )}

      {route === "recruiter" &&
        session?.role === "recruiter" && (
          <Workspace
            user={session}
            onLogout={logout}
            offers={offers}
            setOffers={setOffers}
            onLaunchWizard={() => {
              setStep(1);
              setError("");
              setRoute("wizard");
            }}
          />
        )}

      {route === "candidate" &&
        session?.role === "candidate" && (
          <CandidatePortal
            user={session}
            onLogout={logout}
            offers={offers}
          />
        )}

      {wizard && (
        <main className={`mx-auto max-w-6xl px-6 py-10 ${FADE}`}>
          <div className="mb-6 flex items-center justify-between">
            <button
              className="group text-sm text-brand hover:underline"
              onClick={() =>
                setRoute(
                  session?.role === "recruiter"
                    ? "recruiter"
                    : "home"
                )
              }
            >
              <span className="inline-block transition group-hover:-translate-x-1">
                ←
              </span>{" "}
              {session?.role === "recruiter"
                ? "Retour à l’espace recruteur"
                : "Retour à l’accueil"}
            </button>

            <Pill>Analyse intelligente des CV</Pill>
          </div>

          {/* key restarts the entrance at every wizard step */}
          <div key={step} className={RISE}>
            {step === 1 && (
              <JobStep
                job={job}
                saved={saved}
                onSave={saveJob}
                onSelectExisting={selectExistingJob}
              />
            )}

            {step === 2 && (
              <ImportStep
                files={files}
                setFiles={setFiles}
                onBack={() => setStep(1)}
                onNext={sendCvs}
                loading={loading}
              />
            )}

            {step === 3 && (
              <ResultsStep
                job={job}
                files={files}
                offreId={offreId}
                uploadResult={uploadResult}
                candidates={candidates}
                onBack={() => setStep(2)}
              />
            )}
          </div>
        </main>
      )}

      <footer className="mt-12 border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted">
          <span>© 2026 SMART RECRUITMENT</span>
          <span>Recruter mieux. Connecter les talents.</span>
        </div>
      </footer>
    </>
  );
}