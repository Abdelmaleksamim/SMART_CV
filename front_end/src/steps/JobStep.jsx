import { useEffect, useState, useMemo } from "react";
import { Card, Button, PageTitle, Stepper, Pill } from "../components/ui.jsx";
import { getOffres, mapOffreToJob } from "../lib/api.js";

const EXPERIENCES = ["Débutant", "1 an", "2 ans", "3 ans", "5 ans", "8 ans et plus"];
const LEVELS = ["Bac", "Bac +2", "Bac +3", "Bac +5", "Doctorat"];

const normalizeEducation = (edu) => {
  if (!edu) return "Bac +3";
  const formatted = edu.replace(/^Bac\+(\d)/i, "Bac +$1");
  return LEVELS.includes(formatted) ? formatted : edu;
};

const formatDate = (isoStr) => {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
};

const Field = ({ label, error, hint, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium">
      {label} <span className="text-brand">*</span>
    </span>
    {children}
    {error ? (
      <span className="mt-2 block text-xs text-red-600">{error}</span>
    ) : hint ? (
      <span className="mt-2 block text-xs text-muted">{hint}</span>
    ) : null}
  </label>
);

const input =
  "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function JobStep({ job, saved, onSave, onSelectExisting }) {
  // Mode: "select" (choisir une offre existante) ou "create" (créer une nouvelle offre)
  const [mode, setMode] = useState(() => (job && job.id ? "select" : "select"));

  // État des offres chargées depuis l'API
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");

  // Offre actuellement sélectionnée dans la liste
  const [selectedId, setSelectedId] = useState(job?.id || null);

  // État du formulaire de création / édition
  const [form, setForm] = useState(() => ({
    title: job?.title || "",
    description: job?.description || "",
    skills: Array.isArray(job?.skills) ? job.skills : [],
    experience: job?.experience || "2 ans",
    education: normalizeEducation(job?.education),
  }));
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState({});

  const setFormField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Chargement des offres depuis l'API GET /api/offres
  const fetchOffersList = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = await getOffres();
      setOffers(Array.isArray(data) ? data : []);
      // Si une offre est déjà associée et présente dans les données
      if (job?.id && data.some((o) => o.id === job.id)) {
        setSelectedId(job.id);
      } else if (data.length > 0 && !selectedId) {
        // Pré-sélectionner la première offre la plus récente par défaut
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setFetchError(
        err.message || "Impossible de contacter l'API (http://localhost:8000/api/offres)."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersList();
  }, []);

  // Filtrage des offres par recherche
  const filteredOffers = useMemo(() => {
    if (!search.trim()) return offers;
    const q = search.toLowerCase().trim();
    return offers.filter((o) => {
      const titre = (o.titre || "").toLowerCase();
      const desc = (o.description || "").toLowerCase();
      const competences = Array.isArray(o.competences)
        ? o.competences.join(" ").toLowerCase()
        : "";
      return titre.includes(q) || desc.includes(q) || competences.includes(q);
    });
  }, [offers, search]);

  // Offre sélectionnée objet
  const selectedOffer = useMemo(() => {
    return offers.find((o) => o.id === selectedId) || null;
  }, [offers, selectedId]);

  // Valider la sélection d'une offre existante et passer à l'étape suivante
  const handleConfirmSelect = () => {
    if (!selectedOffer) return;
    const mapped = mapOffreToJob(selectedOffer);
    if (onSelectExisting) {
      onSelectExisting(mapped);
    } else if (onSave) {
      onSave(mapped, true);
    }
  };

  // Pré-remplir le formulaire avec une offre existante pour la modifier ou s'en inspirer
  const handleCustomizeInForm = (offerToUse) => {
    const target = offerToUse || selectedOffer;
    if (!target) return;
    setForm({
      title: target.titre || "",
      description: target.description || "",
      skills: Array.isArray(target.competences) ? [...target.competences] : [],
      experience: target.experience || "2 ans",
      education: normalizeEducation(target.niveau_etudes),
    });
    setErrors({});
    setMode("create");
  };

  // Gestion des compétences dans le formulaire
  const addSkills = (raw) => {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.length) return;
    setFormField("skills", [...new Set([...form.skills, ...items])]);
    setDraft("");
  };

  // Soumission du formulaire de création d'offre
  const submitCreate = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Indiquez le titre du poste.";
    if (!form.description.trim()) errs.description = "Ajoutez une description du poste.";
    if (!form.skills.length) errs.skills = "Ajoutez au moins une compétence.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onSave(form);
    }
  };

  const allLevels = LEVELS.includes(form.education) ? LEVELS : [form.education, ...LEVELS];
  const allExperiences = EXPERIENCES.includes(form.experience)
    ? EXPERIENCES
    : [form.experience, ...EXPERIENCES];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Créer votre offre d’emploi"
        subtitle="Sélectionnez une offre existante depuis l'API ou créez-en une nouvelle pour comparer vos CV."
        badge={saved ? "Enregistrée" : "Étape 1 sur 3"}
      />
      <Stepper current={1} />

      {/* Barre d'onglets : Sélectionner ou Créer */}
      <div className="flex rounded-xl border border-line bg-white p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setMode("select")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            mode === "select"
              ? "bg-brand text-white shadow-sm"
              : "text-muted hover:bg-page hover:text-ink"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span>Sélectionner une offre existante</span>
          {offers.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                mode === "select" ? "bg-white/20 text-white" : "bg-brand-soft text-brand"
              }`}
            >
              {offers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("create");
            setErrors({});
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            mode === "create"
              ? "bg-brand text-white shadow-sm"
              : "text-muted hover:bg-page hover:text-ink"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Créer une nouvelle offre</span>
        </button>
      </div>

      {/* MODE 1 : Sélectionner une offre existante */}
      {mode === "select" && (
        <Card>
          <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-medium">Offres d’emploi disponibles</h2>
                <p className="text-sm text-muted">
                  Choisissez une offre dans la liste pour continuer directement vers l'import des CV.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fetchOffersList}
                  disabled={loading}
                  className="text-xs"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={loading ? "animate-spin" : ""}
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Actualiser
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setForm({ title: "", description: "", skills: [], experience: "2 ans", education: "Bac +3" });
                  }}
                  className="text-xs"
                >
                  ＋ Nouvelle offre
                </Button>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Filtrer par titre, compétence (ex: React, Hadoop, Python...) ou mot-clé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${input} pl-10 pr-10`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-muted hover:text-ink"
                  title="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Erreur de chargement */}
            {fetchError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Erreur lors de la récupération des offres</p>
                    <p className="mt-1 text-xs text-red-600">{fetchError}</p>
                  </div>
                  <Button variant="secondary" onClick={fetchOffersList} className="text-xs">
                    Réessayer
                  </Button>
                </div>
              </div>
            )}

            {/* État de chargement */}
            {loading && !offers.length && (
              <div className="space-y-3 py-6 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
                <p className="text-sm text-muted">Chargement des offres en cours…</p>
              </div>
            )}

            {/* Liste vide ou aucun résultat */}
            {!loading && !fetchError && filteredOffers.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-page/50 p-8 text-center">
                <p className="font-medium">
                  {offers.length === 0
                    ? "Aucune offre d'emploi enregistrée pour le moment."
                    : "Aucune offre ne correspond à votre recherche."}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {offers.length === 0
                    ? "Créez votre première offre pour commencer l'analyse de vos CV."
                    : "Essayez avec d'autres termes ou réinitialisez la recherche."}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  {offers.length > 0 && search && (
                    <Button variant="secondary" onClick={() => setSearch("")} className="text-xs">
                      Effacer la recherche
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setMode("create");
                      setForm({ title: "", description: "", skills: [], experience: "2 ans", education: "Bac +3" });
                    }}
                    className="text-xs"
                  >
                    ＋ Créer une nouvelle offre
                  </Button>
                </div>
              </div>
            )}

            {/* Liste des offres d'emploi */}
            {!loading && filteredOffers.length > 0 && (
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {filteredOffers.map((o) => {
                  const isSelected = selectedId === o.id;
                  const dateStr = formatDate(o.created_at);
                  const skills = Array.isArray(o.competences) ? o.competences : [];

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      onDoubleClick={handleConfirmSelect}
                      className={`group cursor-pointer rounded-xl border p-4.5 transition ${
                        isSelected
                          ? "border-brand bg-brand-soft/25 ring-2 ring-brand/20 shadow-xs"
                          : "border-line bg-white hover:border-brand/40 hover:bg-page/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs transition ${
                              isSelected
                                ? "border-brand bg-brand text-white"
                                : "border-line bg-white text-transparent group-hover:border-brand/50"
                            }`}
                          >
                            ✓
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-ink group-hover:text-brand">
                                {o.titre}
                              </h3>
                              <span className="rounded-md bg-page px-2 py-0.5 text-xs font-mono text-muted">
                                #{o.id}
                              </span>
                              {isSelected && (
                                <Pill className="border-brand/30 bg-brand-soft text-brand font-medium">
                                  Sélectionnée
                                </Pill>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted line-clamp-2">
                              {o.description}
                            </p>
                          </div>
                        </div>

                        {dateStr && (
                          <span className="shrink-0 text-xs text-muted">
                            {dateStr}
                          </span>
                        )}
                      </div>

                      {/* Compétences et critères */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 pl-8">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand"
                          >
                            {skill}
                          </span>
                        ))}
                        {o.experience && (
                          <span className="rounded-md border border-line bg-white px-2 py-0.5 text-xs text-muted">
                            Exp: {o.experience}
                          </span>
                        )}
                        {o.niveau_etudes && (
                          <span className="rounded-md border border-line bg-white px-2 py-0.5 text-xs text-muted">
                            Études: {o.niveau_etudes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pied de page du mode sélection */}
            <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {selectedOffer ? (
                  <p className="text-sm font-medium text-ink">
                    Offre sélectionnée :{" "}
                    <span className="text-brand font-semibold">{selectedOffer.titre}</span>{" "}
                    <span className="text-xs text-muted">(#{selectedOffer.id})</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    Cliquez sur une offre pour la sélectionner, ou double-cliquez pour continuer.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedOffer && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCustomizeInForm(selectedOffer)}
                  >
                    Personnaliser dans le formulaire
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={!selectedOffer}
                  onClick={handleConfirmSelect}
                >
                  Continuer avec cette offre →
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* MODE 2 : Créer une nouvelle offre */}
      {mode === "create" && (
        <Card>
          <form onSubmit={submitCreate} className="space-y-6" noValidate>
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-medium">Nouvelle offre d’emploi</h2>
                <p className="text-sm text-muted">
                  Définissez les critères de l’offre qui serviront à évaluer les CV importés.
                </p>
              </div>
              <span className="text-xs text-muted">
                <span className="text-brand">*</span> Champs obligatoires
              </span>
            </div>

            {/* Raccourci pour pré-remplir à partir d'une offre existante */}
            {offers.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-page p-3 text-xs">
                <span className="text-muted">
                  💡 Vous souhaitez gagner du temps ? Vous pouvez pré-remplir ce formulaire à partir d'une offre existante.
                </span>
                <select
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const found = offers.find((o) => o.id === id);
                    if (found) handleCustomizeInForm(found);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choisir un modèle…
                  </option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id} - {o.titre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Field label="Titre du poste" error={errors.title}>
              <input
                className={input}
                placeholder="Ex. Développeur Full Stack, Data Engineer, Chef de projet..."
                value={form.title}
                onChange={(e) => setFormField("title", e.target.value)}
              />
            </Field>

            <Field
              label="Description du poste"
              error={errors.description}
              hint="Une description précise permet une comparaison plus pertinente avec les CV."
            >
              <textarea
                rows={4}
                className={input}
                placeholder="Décrivez les missions, le contexte et les responsabilités liées à ce poste..."
                value={form.description}
                onChange={(e) => setFormField("description", e.target.value)}
              />
            </Field>

            <Field
              label="Compétences recherchées"
              error={errors.skills}
              hint="Séparez les compétences par une virgule ou appuyez sur Entrée."
            >
              <div className={`${input} flex flex-wrap items-center gap-2 py-2`}>
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-1 text-xs text-brand"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`Retirer ${s}`}
                      className="cursor-pointer font-bold hover:text-brand-dark"
                      onClick={() =>
                        setFormField(
                          "skills",
                          form.skills.filter((x) => x !== s)
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-24 flex-1 bg-transparent py-1 outline-none"
                  placeholder={form.skills.length ? "Ajouter une autre…" : "Ex: Python, React, SQL..."}
                  value={draft}
                  onChange={(e) =>
                    e.target.value.endsWith(",")
                      ? addSkills(e.target.value)
                      : setDraft(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkills(draft);
                    }
                    if (e.key === "Backspace" && !draft) {
                      setFormField("skills", form.skills.slice(0, -1));
                    }
                  }}
                  onBlur={() => addSkills(draft)}
                />
              </div>
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Expérience requise">
                <select
                  className={input}
                  value={form.experience}
                  onChange={(e) => setFormField("experience", e.target.value)}
                >
                  {allExperiences.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Niveau d’études">
                <select
                  className={input}
                  value={form.education}
                  onChange={(e) => setFormField("education", e.target.value)}
                >
                  {allLevels.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="text-left text-xs text-brand hover:underline"
              >
                ← Revenir aux offres existantes
              </button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setForm({
                      title: "",
                      description: "",
                      skills: [],
                      experience: "2 ans",
                      education: "Bac +3",
                    });
                    setErrors({});
                  }}
                >
                  Effacer
                </Button>
                <Button type="submit">Enregistrer et continuer →</Button>
              </div>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
