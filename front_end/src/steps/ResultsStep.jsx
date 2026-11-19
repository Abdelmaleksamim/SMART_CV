import { Card, Button, PageTitle, Stepper, Pill } from "../components/ui.jsx";
import { rankingToCsv } from "../lib/scoring.js";

// Animations (keyframes are defined once in App.jsx)
const RISE = "animate-[srRise_.55s_cubic-bezier(.2,.7,.2,1)_both]";
const BAR = "animate-[srBar_.9s_cubic-bezier(.2,.7,.2,1)_both]";

export default function ResultsStep({
  job,
  files,
  candidates = [],
  onBack,
}) {
  const download = () => {
    const blob = new Blob(
      [rankingToCsv(job, candidates)],
      { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "classement.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const qualifiedCandidates = candidates.filter(
    (candidate) => candidate.score >= 50
  );

  const bestScore = qualifiedCandidates.length
    ? Math.max(...qualifiedCandidates.map((c) => c.score))
    : 0;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Analyser et comparer"
        subtitle={`Comparez les CV importés au regard du poste ${job.title} et des compétences ${job.skills.join(", ")}.`}
        badge="Étape 3 sur 3"
      />

      <Stepper current={3} />

      <Card>
        <h2 className="text-lg font-medium">
          Analyse et comparaison des CV
        </h2>

        <p className="mb-5 text-sm text-muted">
          Les candidats ci-dessous ont un score de compatibilité supérieur
          ou égal à 50 % avec le poste {job.title}.
        </p>

        {/* Summary figures */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            ["CV analysés", files.length],
            ["Candidats retenus", qualifiedCandidates.length],
            ["Meilleur score", `${bestScore} %`],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`rounded-xl border border-line bg-white p-4 ${RISE}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div
          className={`rounded-xl bg-page p-5 ${RISE}`}
          style={{ animationDelay: "240ms" }}
        >
          <p className="text-xs text-muted">Offre de référence</p>

          <p className="mt-1 text-xl font-medium">{job.title}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-brand-soft px-2.5 py-1 text-xs text-brand transition hover:-translate-y-0.5"
              >
                {skill}
              </span>
            ))}
          </div>

          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">
                Expérience requise
              </dt>
              <dd className="font-medium">{job.experience}</dd>
            </div>

            <div>
              <dt className="text-xs text-muted">
                Niveau d’études
              </dt>
              <dd className="font-medium">{job.education}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 mb-3 flex justify-between text-sm">
          <h3 className="font-medium">
            Classement des candidats
          </h3>

          <span className="text-xs text-muted">
            Score ≥ 50 %
          </span>
        </div>

        {qualifiedCandidates.length === 0 && (
          <p className="rounded-lg border border-line p-4 text-sm text-muted">
            Aucun candidat n’atteint 50 %. Modifiez l’offre ou importez
            d’autres CV.
          </p>
        )}

        <ol className="space-y-3">
          {qualifiedCandidates.map((candidate, index) => (
            <li
              key={candidate.id}
              className={`group relative overflow-hidden rounded-lg border bg-page/50 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg ${
                index === 0
                  ? "border-brand/40 ring-1 ring-brand/20"
                  : "border-line"
              } ${RISE}`}
              style={{ animationDelay: `${320 + index * 70}ms` }}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium transition group-hover:scale-110 ${
                    index === 0
                      ? "bg-brand text-white"
                      : "bg-brand-soft text-brand"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {candidate.name}
                  </p>

                  <p className="text-xs text-muted">
                    {candidate.headline} • {candidate.years} an
                    {candidate.years > 1 ? "s" : ""} d’expérience
                  </p>
                </div>

                <Pill className="border-green-200 bg-green-50 font-medium text-green-700">
                  {candidate.score} %
                </Pill>
              </div>

              {/* Animated score bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-page">
                <div
                  className={`h-full origin-left rounded-full bg-brand ${BAR}`}
                  style={{
                    width: `${Math.min(candidate.score, 100)}%`,
                    animationDelay: `${420 + index * 70}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {files.length} CV importé(s). Vous pouvez revenir à l’étape 2
            pour ajouter ou modifier des CV.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBack}>
              Retour à l’import
            </Button>

            <Button
              disabled={!qualifiedCandidates.length}
              onClick={download}
            >
              Télécharger le classement →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}