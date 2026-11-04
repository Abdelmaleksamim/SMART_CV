import { useState } from "react";
import { Header } from "./components/ui.jsx";
import JobStep from "./steps/JobStep.jsx";
import ImportStep from "./steps/ImportStep.jsx";
import ResultsStep from "./steps/ResultsStep.jsx";
import { createOffre, uploadCvs } from "./lib/api.js";

const EMPTY_JOB = { title: "", description: "", skills: [], experience: "2 ans", education: "Bac +3" };

// Identifie un envoi : même offre + mêmes fichiers = pas besoin de renvoyer
const uploadKey = (offreId, files) =>
  `${offreId}|${files.map((f) => `${f.name}:${f.size}`).join(",")}`;

export default function App() {
  const [step, setStep] = useState(1);
  const [job, setJob] = useState(EMPTY_JOB);
  const [saved, setSaved] = useState(false);
  const [files, setFiles] = useState([]);

  const [offreId, setOffreId] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [lastUploadKey, setLastUploadKey] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Étape 1 → 2 : POST /api/offres
  const saveJob = async (j) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const offre = await createOffre(j);
      setJob(j);
      setOffreId(offre.id);
      setSaved(true);
      setLastUploadKey(null); // nouvelle offre : les CV devront être renvoyés
      setUploadResult(null);
      setStep(2);
    } catch (err) {
      setError(err.message || "Impossible d’enregistrer l’offre. Vérifiez que le serveur est lancé.");
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 → 3 : POST /api/offres/{id}/cvs
  const sendCvs = async () => {
    if (loading) return;
    const key = uploadKey(offreId, files);
    if (key === lastUploadKey) { // déjà envoyés : on évite les doublons en base
      setStep(3);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await uploadCvs(offreId, files);
      setUploadResult(res);
      setLastUploadKey(key);
      setStep(3);
    } catch (err) {
      setError(err.message || "Impossible d’envoyer les CV. Vérifiez que le serveur est lancé.");
    } finally {
      setLoading(false);
    }
  };

  const goTo = (n) => { setError(""); setStep(n); };

  return (
    <>
      <Header step={step} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <p role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand">
            {step === 1 ? "Enregistrement de l’offre…" : "Envoi et lecture des CV…"}
          </p>
        )}

        {step === 1 && <JobStep job={job} saved={saved} onSave={saveJob} />}
        {step === 2 && (
          <ImportStep files={files} setFiles={setFiles} onBack={() => goTo(1)} onNext={sendCvs} />
        )}
        {step === 3 && (
          <ResultsStep
            job={job}
            files={files}
            offreId={offreId}
            uploadResult={uploadResult}
            onBack={() => goTo(2)}
          />
        )}
      </main>
    </>
  );
}