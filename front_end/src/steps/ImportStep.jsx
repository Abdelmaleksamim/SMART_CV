import { useRef, useState } from "react";
import {
  Card,
  Button,
  PageTitle,
  Stepper,
  Pill,
} from "../components/ui.jsx";

const MAX = 5 * 1024 * 1024;

// Animations (keyframes are defined once in App.jsx)
const RISE = "animate-[srRise_.5s_cubic-bezier(.2,.7,.2,1)_both]";
const POP = "animate-[srPop_.35s_cubic-bezier(.2,.9,.3,1.2)_both]";
const BOB = "animate-[srBob_1.1s_ease-in-out_infinite]";

const size = (bytes) =>
  `${(bytes / 1048576).toFixed(1).replace(".", ",")} Mo`;

export default function ImportStep({
  files,
  setFiles,
  onBack,
  onNext,
  loading = false,
}) {
  const ref = useRef(null);

  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const add = (list) => {
    if (loading) return;

    const errs = [];
    const next = [...files];

    [...list].forEach((file) => {
      if (file.type !== "application/pdf") {
        errs.push(
          `${file.name} : format non accepté (PDF uniquement).`
        );
      } else if (file.size > MAX) {
        errs.push(`${file.name} : dépasse 5 Mo.`);
      } else if (
        next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size
        )
      ) {
        errs.push(`${file.name} : déjà importé.`);
      } else {
        next.push(file);
      }
    });

    setFiles(next);
    setErrors(errs);
  };

  const remove = (fileToRemove) => {
    if (loading) return;

    setFiles(files.filter((file) => file !== fileToRemove));
  };

  return (
    <div className={`space-y-6 ${RISE}`}>
      <PageTitle
        title="Importer les CV"
        subtitle="Ajoutez un ou plusieurs CV PDF pour préparer l’analyse et le classement des candidatures."
        badge="Étape 2 sur 3"
      />

      <Stepper current={2} />

      <Card>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">
              Importer un ou plusieurs CV PDF
            </h2>

            <p className="text-sm text-muted">
              Glissez-déposez vos fichiers ou utilisez le bouton ci-dessous.
            </p>
          </div>

          <Pill className="bg-brand-soft text-brand">
            PDF uniquement
          </Pill>
        </div>

        {/* Drag and drop area */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!loading) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);

            if (!loading) {
              add(event.dataTransfer.files);
            }
          }}
          className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 text-center transition duration-300 ${
            over
              ? "scale-[1.01] border-brand bg-brand-soft shadow-lg"
              : "border-line bg-page/50 hover:border-brand/60"
          } ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          <span
            className={`grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand transition duration-300 ${
              over ? `scale-110 ${BOB}` : ""
            }`}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </span>

          <p className="mt-2 font-medium">
            {over ? "Relâchez pour ajouter" : "Déposez vos CV ici"}
          </p>

          <p className="text-xs text-muted">
            Formats acceptés : PDF • Taille maximale par fichier : 5 Mo
          </p>

          <Button
            type="button"
            className="mt-3"
            disabled={loading}
            onClick={() => ref.current?.click()}
          >
            Parcourir les fichiers
          </Button>

          <input
            ref={ref}
            type="file"
            accept="application/pdf"
            multiple
            hidden
            disabled={loading}
            onChange={(event) => {
              add(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <ul
            role="alert"
            className={`mt-4 space-y-1 rounded-lg bg-red-50 p-3 text-xs text-red-700 ${POP}`}
          >
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        {/* Selected files */}
        <div className="mt-8">
          <div className="mb-3 flex justify-between text-sm">
            <h3 className="font-medium">
              Documents importés
            </h3>

            <span className="text-xs text-muted">
              {files.length} fichier{files.length > 1 ? "s" : ""} prêt
              {files.length > 1 ? "s" : ""} à l’analyse
            </span>
          </div>

          {files.length === 0 && (
            <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
              Aucun CV pour l’instant. Ajoutez au moins un fichier PDF.
            </p>
          )}

          <ul className="space-y-3">
            {files.map((file) => (
              <li
                key={file.name + file.size}
                className={`group relative flex items-center gap-4 overflow-hidden rounded-lg border border-line bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md ${POP}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-medium text-brand transition group-hover:scale-110">
                  PDF
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.name}
                  </p>

                  <p className="text-xs text-muted">
                    {size(file.size)} • Prêt à l’analyse
                  </p>
                </div>

                <Pill className="bg-brand-soft text-brand">
                  Prêt
                </Pill>

                <button
                  type="button"
                  disabled={loading}
                  className="text-xs text-muted transition hover:text-red-600 disabled:opacity-50"
                  onClick={() => remove(file)}
                >
                  Retirer
                </button>

                {/* Scanning line while the analysis runs */}
                {loading && (
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[srScan_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand/10 to-transparent" />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Vous pouvez revenir à l’étape 1 pour modifier l’offre.
            <br />
            L’analyse sera lancée avec les CV ci-dessus.
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onBack}
              disabled={loading}
            >
              Retour
            </Button>

            <Button
              disabled={!files.length || loading}
              onClick={onNext}
            >
              {loading
                ? "Analyse en cours..."
                : "Continuer vers l’analyse →"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}