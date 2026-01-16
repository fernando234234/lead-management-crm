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
    title: "Riepilogo Profittabilita",
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

export const marketingTourSteps: TourStep[] = [
  {
    target: "[data-tour='stats-grid']",
    title: "Benvenuto nella Dashboard Marketing!",
    content: "Monitora le tue campagne attive, i lead generati e il ROI complessivo.",
    placement: "bottom",
  },
  {
    target: "[data-tour='campaigns-overview']",
    title: "Panoramica Campagne",
    content: "Vedi le performance delle tue campagne per piattaforma e corso.",
    placement: "bottom",
  },
  {
    target: "[data-tour='roi-section']",
    title: "ROI e Costi",
    content: "Analizza CPL Stimato (da budget) e CPL Effettivo (costi reali per lead). Passa il mouse sulle icone (?) per spiegazioni.",
    placement: "top",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigazione",
    content: "Vai su Campagne per gestirle, Leads per modificare i costi di acquisizione, e ROI per analisi dettagliate.",
    placement: "right",
  },
];
