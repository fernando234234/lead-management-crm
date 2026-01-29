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
    content: "Usa il menu per: Lead, Utenti, Campagne, Corsi, Analisi Piattaforme (confronto Meta/Google/LinkedIn/TikTok), Report e Impostazioni.",
    placement: "right",
  },
];

export const commercialTourSteps: TourStep[] = [
  {
    target: "[data-tour='stats-grid']",
    title: "Benvenuto nella Dashboard Commerciale!",
    content: "Qui vedi i tuoi lead assegnati, quanti ne hai contattati oggi, i callback pendenti e i lead target da chiamare.",
    placement: "bottom",
  },
  {
    target: "[data-tour='tasks']",
    title: "Lead da Contattare",
    content: "Questa tabella mostra i lead che richiedono la tua attenzione: quelli non ancora contattati o da richiamare.",
    placement: "top",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigazione",
    content: "Usa il menu per accedere a: I Miei Lead (lista completa), Pipeline (vista per stato), Promemoria e Corsi disponibili.",
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
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigazione",
    content: "Usa il menu per: Campagne, Lead per Campagna, Costi, Analisi Piattaforme (confronto Meta/Google/LinkedIn/TikTok) e ROI.",
    placement: "right",
  },
];

