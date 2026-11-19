
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Handles API responses and errors
async function handle(res) {
  if (res.ok) return res.json();

  const err = await res.json().catch(() => ({}));

  // 422: detail is an array
  // 404 / 413: detail is usually a string
  const msg = Array.isArray(err.detail)
    ? err.detail.map((d) => d.msg).join(" ")
    : err.detail || "Erreur serveur";

  throw new Error(msg);
}

// Convert backend offer (French) to frontend job (English)
export const mapOffreToJob = (o) => ({
  id: o.id,
  title: o.titre || "",
  description: o.description || "",
  skills: Array.isArray(o.competences) ? o.competences : [],
  experience: o.experience || "2 ans",
  education: o.niveau_etudes || "Bac +3",
  createdAt: o.created_at,
});

// GET /api/offres
export const getOffres = () =>
  fetch(`${BASE}/api/offres`).then(handle);

// POST /api/offres
export const createOffre = (job) =>
  fetch(`${BASE}/api/offres`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      titre: job.title,
      description: job.description,
      competences: job.skills,
      experience: job.experience,
      niveau_etudes: job.education,
    }),
  }).then(handle);

// PUT /api/offres/:id
export const updateOffre = (id, job) =>
  fetch(`${BASE}/api/offres/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      titre: job.title,
      description: job.description,
      competences: job.skills,
      experience: job.experience,
      niveau_etudes: job.education,
    }),
  }).then(handle);

// DELETE /api/offres/:id
export const deleteOffre = (id) =>
  fetch(`${BASE}/api/offres/${id}`, {
    method: "DELETE",
  }).then((res) => {
    if (res.ok) return true;
    return handle(res);
  });

// POST /api/offres/:id/cvs
// Upload multiple PDF files
export const uploadCvs = (offreId, files) => {
  const body = new FormData();

  files.forEach((file) => {
    body.append("files", file);
  });

  // Do not set Content-Type manually.
  // The browser adds the multipart boundary automatically.
  return fetch(`${BASE}/api/offres/${offreId}/cvs`, {
    method: "POST",
    body,
  }).then(handle);
};

// GET /api/offres/:id/cvs
// Retrieve uploaded CVs and their analysis results
export const getCvsByOffre = (offreId) =>
  fetch(`${BASE}/api/offres/${offreId}/cvs`).then(handle);
