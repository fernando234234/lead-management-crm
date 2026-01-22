import { TourStep } from "@/components/ui/OnboardingTour";

/**
 * Onboarding tour steps for each user role
 * All text in Italian
 */

export const adminTourSteps: TourStep[] = [
  {
    target: "[data-tour='stats-grid']",
    title: "Benvenuto nella Dashboard Admin!",
    content: "Qui trovi una panoramica completa del sistema: utenti, corsi, campagne, lead e ricavi.",
    placement: "bottom",
  },
  {
    target: "[data-tour='lead-distribution']",
    title: "Distribuzione Lead",
    content: "Questo grafico mostra come sono distribuiti i lead per stato: Nuovo, Contattato, In Trattativa, Iscritto, Perso.",
    placement: "right",
  },
  {
    target: "[data-tour='recent-leads']",
    title: "Lead Recenti",
    content: "Tieni d'occhio gli ultimi lead aggiunti e il loro stato attuale.",
    placement: "top",
  },
  {
    target: "[data-tour='profitability']",
    title: "Riepilogo Profittabilità",
    content: "Monitora ricavi, costi, profitto netto, costo per lead e ROI. Passa il mouse sulle icone (?) per spiegazioni dettagliate.",
    placement: "top",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigazione",
    content: "Usa il menu laterale per accedere a Lead, Utenti, Campagne, Corsi, Report e Impostazioni.",
    placement: "right",
  },
];

export const commercialTourSteps: TourStep[] = [
  {
    target: "[data-tour='stats-grid']",
    title: "Benvenuto nella Dashboard Commerciale!",
    content: "Qui vedi i tuoi lead assegnati, le chiamate di oggi e il tuo tasso di conversione.",
    placement: "bottom",
  },
  {
    target: "[data-tour='pipeline']",
    title: "Pipeline Lead",
    content: "Visualizza i tuoi lead organizzati per stato. Trascina i lead tra le colonne per aggiornare il loro stato.",
    placement: "bottom",
  },
  {
    target: "[data-tour='tasks']",
    title: "Attivita di Oggi",
    content: "Le tue attivita e chiamate programmate per oggi. Non dimenticare di seguire i lead!",
    placement: "left",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigazione",
    content: "Accedi a Leads per la lista completa, Calendario per le attivita, e Performance per i tuoi risultati.",
    placement: "right",
  },
];

export const adminCommercialDashboardTourSteps: TourStep[] = [
  {
    target: "[data-tour='kpi-section']",
    title: "KPI Commerciali",
    content: "Monitora i risultati chiave: totale lead, iscrizioni, conversioni e costi. Il risultato netto ti dice subito se sei in profitto.",
    placement: "right",
  },
  {
    target: "[data-tour='funnel-section']",
    title: "Funnel di Vendita",
    content: "Visualizza il percorso dei lead dal primo contatto all'iscrizione. Identifica dove perdi potenziali clienti.",
    placement: "left",
  },
  {
    target: "[data-tour='course-filter']",
    title: "Nuovo Filtro Corsi",
    content: "Ora puoi filtrare le performance dei commerciali per corso specifico! Seleziona un corso per vedere chi vende meglio cosa.",
    placement: "bottom",
  },
  {
    target: "[data-tour='commercial-table']",
    title: "Performance Commerciali",
    content: "Analizza i risultati di ogni commerciale. Clicca sulle intestazioni per ordinare per lead, iscrizioni o costi.",
    placement: "top",
  },
];

export const marketingTourSteps: TourStep[] = [
  {
    target: "[data-tour='stats-grid']",
    title: "Benvenuto nella Dashboard Marketing!",
    content: "Qui vedi una panoramica delle tue campagne: campagne attive, lead generati, spesa totale e costo per lead.",
    placement: "bottom",
  },
  {
    target: "[data-tour='campaigns-overview']",
    title: "Panoramica Campagne",
    content: "Visualizza la distribuzione della spesa per piattaforma e confronta le performance delle campagne attive.",
    placement: "bottom",
  },
  {
    target: "[data-tour='roi-section']",
    title: "Analisi ROI",
    content: "Monitora ricavi vs spesa, costi per tipo (lead, consulenza, contratto) e il ROI complessivo delle tue campagne.",
    placement: "top",
  },
];

