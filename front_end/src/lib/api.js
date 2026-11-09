const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function handle(res) {
  if (res.ok) return res.json();
  const err = await res.json().catch(() => ({}));
  // 422 : detail est un tableau ; 404/413 : detail est un texte
  const msg = Array.isArray(err.detail)
    ? err.detail.map((d) => d.msg).join(" ")
    : err.detail || "Erreur serveur";
  throw new Error(msg);
}

// Les noms de champs changent entre le front (anglais) et l'API (français)
export const createOffre = (job) =>
  fetch(`${BASE}/api/offres`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titre: job.title,
      description: job.description,
      competences: job.skills,
      experience: job.experience,
      niveau_etudes: job.education,
    }),
  }).then(handle);

export const uploadCvs = (offreId, files) => {
  const body = new FormData();
  files.forEach((f) => body.append("files", f)); // même clé « files » répétée
  // Ne définissez pas Content-Type : le navigateur ajoute le boundary tout seul
  return fetch(`${BASE}/api/offres/${offreId}/cvs`, { method: "POST", body }).then(handle);
};