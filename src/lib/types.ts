/**
 * Airtable record shapes for the base `appyvKVq6Q6kr37La`.
 * Field names mirror the French names in the Airtable schema.
 */

export type ProjetStatut = '🆕 Nouveau' | '🏗️ En cours' | '✅ Terminé' | '⏸️ En pause'
export type Priorite = '🔴 Haute' | '🟡 Moyenne' | '🟢 Basse'

export type ProjetFields = {
  'Nom du projet': string
  'Type'?: string
  'Statut'?: ProjetStatut
  'Priorité'?: Priorite
  '% Avancement'?: number
  'Description'?: string
  'Notes management'?: string
  'Client'?: string
  'Technos'?: string
  // Champs additionnels exploités par le Radar Projets (lecture seule).
  'Processus métier impacté'?: string
  'Technos utilisées'?: string[]
  'Date de début'?: string
  'Tâches'?: string[] // multipleRecordLinks → record IDs des tâches liées
}

export type TacheStatut = '🎯 À faire' | '🚧 En cours' | '✅ Terminé'
export type TacheType = 'Avancée' | 'Idée' | 'Décision' | 'Bloquant' | 'Action'

export type TacheFields = {
  'Titre de la tâche': string
  "Type d'item"?: TacheType
  'Statut'?: TacheStatut
  'Priorité'?: Priorite
  'Description / Sous-tâches'?: string
  'Date du jour'?: string
  'Date cible'?: string
  'Bloquant'?: boolean
  'Projet parent'?: string[]
  'Sous-tâches'?: string[] // multipleRecordLinks → record IDs des sous-tâches
}

export type SousTacheFields = {
  'Action': string
  'Fait'?: boolean
  'Notes'?: string
  'Tâche parente'?: string[] // multipleRecordLinks → record IDs des tâches
}

export type SessionType = 'Check-in' | 'Check-out' | 'Session libre'

export type SessionFields = {
  'Id'?: number
  'Date'?: string
  'Type'?: SessionType
  'Résumé'?: string
  'Tâches créées'?: string
  'Tâches modifiées'?: string
  'Projets concernés'?: string[]
  'URL conversation'?: string
  'Durée'?: number
  'Focus du jour'?: string
}

export type SujetApprentissageFields = {
  'Thème': string
  'Domaine'?: string
  'Niveau'?: string
  'Angle pédagogique'?: string
  'Source'?: string
  'Référentiels'?: string[]
  'Priorité'?: string
  'Statut'?: string
  'Ordre'?: number
}

export type FicheFields = {
  'Titre': string
  'Sujet'?: string
  'Domaine'?: string
  'Date'?: string
  'Niveau'?: string
  'Score'?: string
  'Pourcentage'?: number
  'Enseignements'?: string
  'Glossaire'?: string
  'Trace'?: string
  'Schema'?: string
  'Source'?: string
}

export type AirtableRecord<F> = {
  id: string
  fields: F
  createdTime?: string
}

export const TABLES = {
  Projets: 'Projets IA & Automatisation',
  Taches: 'Tâches',
  SousTaches: 'Sous-tâches',
  Sessions: 'Sessions Claude',
  Sujets: "Sujets d'apprentissage",
  Fiches: "Fiches d'apprentissage",
} as const
