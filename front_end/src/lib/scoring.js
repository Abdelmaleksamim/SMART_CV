
import { uploadCvs, getCvsByOffre } from "./api";

// Convert backend CV data (French) to frontend candidate data (English)
const mapCvToCandidate = (cv) => ({
  id: cv.id,

  // Basic information
  name: cv.nom_candidat || cv.nom_fichier || "Candidat inconnu",
  headline: cv.poste || "Poste non précisé",
  years: Number(cv.annees_experience) || 0,
  score: Number(cv.score) || 0,

  // Contact information
  email: cv.email || "",
  telephone: cv.telephone || "",

  // Profile and experience
  profile: cv.profil || "",
  experience: cv.experience_texte || "",
  education: cv.niveau_etudes || "",
  formations: cv.formations || [],

  // Skills
  skills: cv.competences || [],
  transversalSkills: cv.competences_transversales || [],
  matchingSkills: cv.matching_skills || [],
  missingSkills: cv.missing_skills || [],

  // Matching information
  category: cv.categorie || "",
  experienceMatch: cv.experience_match,
  educationMatch: cv.education_match,
  justification: cv.justification || "",

  // CV file information
  status: cv.statut || "",
  filename: cv.nom_fichier || "",
});

// Upload CVs and retrieve their analysis results
export async function analyzeCvs(job, files) {
  if (!job?.id) {
    throw new Error("ID de l'offre manquant.");
  }

  if (!files?.length) {
    throw new Error("Veuillez sélectionner au moins un CV.");
  }

  // Step 1: Upload CV files (POST)
  await uploadCvs(job.id, files);

  // Step 2: Retrieve analysis results (GET)
  const data = await getCvsByOffre(job.id);

  if (!Array.isArray(data)) {
    throw new Error("Format de réponse inattendu du serveur.");
  }

  // Step 3: Convert and sort candidates by score
  return data
    .map(mapCvToCandidate)
    .sort((a, b) => b.score - a.score);
}

// Export candidate ranking to CSV
export function rankingToCsv(job, candidates) {
  const rows = [
    ["Rang", "Candidat", "Expérience (ans)", "Score (%)"],
  ];

  candidates.forEach((candidate, index) => {
    rows.push([
      index + 1,
      candidate.name,
      candidate.years,
      candidate.score,
    ]);
  });

  return (
    `# ${job.title}\n` +
    rows.map((row) => row.join(";")).join("\n")
  );
}
