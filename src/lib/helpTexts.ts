/**
 * Centralized help texts for tooltips and explanations
 * All text in Italian for the client
 */

export const helpTexts = {
  // Cost Metrics
  cplEstimato: "Costo Per Lead Stimato: Budget della campagna diviso per il numero totale di lead. È una stima basata sul budget allocato.",
  cplEffettivo: "Costo Per Lead Effettivo: Somma dei costi di acquisizione inseriti per ogni singolo lead. Riflette il costo reale sostenuto.",
  costoConsulenza: "Spesa totale diviso per i lead contattati (che hanno ricevuto almeno una chiamata/consulenza).",
  costoContratto: "Spesa totale diviso per i lead che si sono iscritti. Indica quanto costa acquisire un cliente pagante.",
  
  // ROI & Financial
  roi: "Return On Investment: Misura il rendimento dell'investimento. Formula: ((Ricavo - Spesa) / Spesa) × 100. Un ROI del 100% significa che hai raddoppiato l'investimento.",
  ricavo: "Entrate totali calcolate come: Numero di iscritti × Prezzo del corso.",
  spesa: "Spesa effettiva della campagna. Se disponibili, usa i costi reali per lead, altrimenti il budget stimato.",
  profitto: "Guadagno netto: Ricavo totale meno la spesa totale.",
  
  // Lead Status
  leadNuovo: "Lead appena acquisito, non ancora contattato dal commerciale.",
  leadContattato: "Lead che ha ricevuto almeno una chiamata o contatto.",
  leadInTrattativa: "Lead interessato, in fase di negoziazione o decisione.",
  leadIscritto: "Lead convertito in cliente - ha completato l'iscrizione al corso.",
  leadPerso: "Lead che ha deciso di non procedere con l'iscrizione.",
  
  // Lead Fields
  isTarget: "Lead prioritario che richiede attenzione particolare. Solitamente lead con alto potenziale di conversione.",
  acquisitionCost: "Costo effettivo sostenuto per acquisire questo specifico lead dalla piattaforma pubblicitaria.",
  callOutcome: "Esito dell'ultima chiamata effettuata al lead.",
  
  // Campaign
  campaignBudget: "Budget totale allocato per questa campagna pubblicitaria.",
  campaignPlatform: "Piattaforma pubblicitaria utilizzata (Facebook, Google Ads, LinkedIn, etc.).",
  
  // Conversion
  conversionRate: "Percentuale di lead che si sono iscritti rispetto al totale dei lead acquisiti.",
  contactRate: "Percentuale di lead contattati rispetto al totale dei lead acquisiti.",
  
  // Dashboard sections
  panoramica: "Riepilogo delle metriche principali del sistema.",
  funnel: "Visualizzazione del percorso dei lead dal primo contatto all'iscrizione.",
  performance: "Analisi delle prestazioni di campagne, commerciali e corsi.",
  
  // Actions
  filtra: "Filtra i dati per visualizzare solo le informazioni rilevanti.",
  ordina: "Clicca per ordinare la tabella per questa colonna.",
  esporta: "Scarica i dati in formato Excel o CSV.",
};

// Short labels for table headers with tooltips
export const shortLabels = {
  cplEst: { label: "CPL Est.", help: helpTexts.cplEstimato },
  cplEff: { label: "CPL Eff.", help: helpTexts.cplEffettivo },
  cConsulenza: { label: "C/Consulenza", help: helpTexts.costoConsulenza },
  cContratto: { label: "C/Contratto", help: helpTexts.costoContratto },
  roi: { label: "ROI", help: helpTexts.roi },
  conv: { label: "Conv.", help: helpTexts.conversionRate },
};
