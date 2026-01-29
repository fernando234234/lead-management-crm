"use client";

import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  CheckCircle,
  Phone,
  Calendar,
  BarChart3,
  BookOpen,
  Search,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Stato Lead
  {
    category: "Stato Lead",
    question: "Cosa significa 'Contattato'?",
    answer: "Un lead è 'Contattato' quando hai effettuato almeno una chiamata o comunicazione con il potenziale cliente. Questo stato indica che hai iniziato il processo di vendita. Quando attivi questo toggle, viene registrata automaticamente la data del primo contatto.",
  },
  {
    category: "Stato Lead",
    question: "Cosa significa 'Target'?",
    answer: "Un lead 'Target' è un lead prioritario che richiede attenzione particolare. Solitamente sono lead con alto potenziale di conversione, interessati al corso, o con budget disponibile. Usa questo stato per identificare rapidamente i lead più promettenti su cui concentrarti.",
  },
  {
    category: "Stato Lead",
    question: "Cosa significa 'Iscritto'?",
    answer: "Un lead 'Iscritto' è un lead che ha firmato un contratto e completato l'iscrizione al corso. IMPORTANTE: Segna un lead come iscritto SOLO quando il contratto è stato effettivamente firmato. Il sistema ti chiederà conferma prima di salvare questo stato.",
  },
  {
    category: "Stato Lead",
    question: "Qual è la differenza tra 'Target' e 'Iscritto'?",
    answer: "Target = lead interessato, ancora in fase di negoziazione. Iscritto = lead che ha firmato il contratto. Un lead può essere Target ma non ancora Iscritto. Una volta Iscritto, il lead ha completato il percorso di vendita.",
  },

  // Gestione Lead
  {
    category: "Gestione Lead",
    question: "Come aggiungo un nuovo lead manualmente?",
    answer: "Clicca sul pulsante 'Nuovo Lead' nella pagina I Miei Lead. Dovrai inserire: nome del lead, corso di interesse, piattaforma di provenienza (anche se manuale), e eventuali note. Il lead verrà automaticamente assegnato a te.",
  },
  {
    category: "Gestione Lead",
    question: "Come modifico le informazioni di un lead?",
    answer: "Ci sono due modi: 1) Usa i toggle rapidi nella tabella per cambiare velocemente lo stato (Contattato/Target/Iscritto). 2) Clicca sull'icona matita per aprire il form completo di modifica dove puoi aggiornare nome, note, e tutti gli stati.",
  },
  {
    category: "Gestione Lead",
    question: "Posso vedere i dettagli completi di un lead?",
    answer: "Sì, clicca sull'icona occhio nella colonna Azioni per aprire la scheda dettagliata del lead con tutte le informazioni, storico contatti, e note.",
  },
  {
    category: "Gestione Lead",
    question: "Come filtro i miei lead?",
    answer: "Usa i filtri in alto nella pagina: puoi cercare per nome, filtrare per stato (Contattato/Target/Iscritto), e selezionare un corso specifico. Clicca 'Reset' per cancellare tutti i filtri.",
  },

  // Pipeline
  {
    category: "Pipeline",
    question: "Cos'è la Pipeline?",
    answer: "La Pipeline è una vista Kanban che mostra i tuoi lead organizzati per stato: Da Contattare, Contattato, Target, Iscritto. Puoi trascinare i lead tra le colonne per aggiornare rapidamente il loro stato.",
  },
  {
    category: "Pipeline",
    question: "Come sposto un lead nella Pipeline?",
    answer: "Clicca e trascina la scheda del lead nella colonna desiderata. Lo stato verrà aggiornato automaticamente. Se sposti un lead su 'Iscritto', il sistema ti chiederà conferma che il contratto sia stato firmato.",
  },

  // Promemoria
  {
    category: "Promemoria",
    question: "Come creo un promemoria per un lead?",
    answer: "Vai nella sezione Promemoria e clicca 'Nuovo Promemoria'. Seleziona il lead, imposta data/ora, e scrivi una descrizione. Riceverai una notifica quando sarà il momento di agire.",
  },
  {
    category: "Promemoria",
    question: "Dove vedo i miei promemoria in scadenza?",
    answer: "I promemoria sono visibili nella Dashboard commerciale e nella pagina Promemoria. Quelli in scadenza oggi o scaduti sono evidenziati in rosso.",
  },

  // Statistiche
  {
    category: "Statistiche",
    question: "Cosa mostrano le mie statistiche?",
    answer: "Le tue statistiche includono: numero totale di lead assegnati, quanti hai contattato, quanti sono Target, quanti sono diventati Iscritti, e il tuo tasso di conversione. Usa questi dati per monitorare le tue performance.",
  },
  {
    category: "Statistiche",
    question: "Come viene calcolato il tasso di conversione?",
    answer: "Il tasso di conversione è: (Lead Iscritti / Lead Totali) × 100. Ad esempio, se hai 100 lead e 10 si sono iscritti, il tuo tasso è del 10%.",
  },

  // Best Practice
  {
    category: "Best Practice",
    question: "Qual è il flusso di lavoro consigliato?",
    answer: "1) Ricevi un nuovo lead assegnato. 2) Contatta il lead e segna 'Contattato'. 3) Se è interessato, segnalo come 'Target' e aggiungi note. 4) Continua a seguirlo con promemoria. 5) Quando firma, segnalo come 'Iscritto'. 6) Ripeti!",
  },
  {
    category: "Best Practice",
    question: "Ogni quanto devo aggiornare i lead?",
    answer: "Aggiorna lo stato del lead subito dopo ogni interazione. Questo ti aiuta a mantenere i dati accurati e permette all'azienda di avere statistiche affidabili in tempo reale.",
  },
  {
    category: "Best Practice",
    question: "Cosa scrivo nelle note?",
    answer: "Nelle note scrivi: esito della chiamata, obiezioni del cliente, interessi specifici, disponibilità economica, quando richiamarlo, e qualsiasi info utile per la prossima interazione. Note dettagliate = conversioni più facili!",
  },
];

const categories = Array.from(new Set(faqData.map((item) => item.category)));

const categoryIcons: Record<string, React.ElementType> = {
  "Stato Lead": Target,
  "Gestione Lead": Users,
  "Pipeline": BarChart3,
  "Promemoria": Calendar,
  "Statistiche": BarChart3,
  "Best Practice": CheckCircle,
};

export default function CommercialFAQPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQ = faqData.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === null || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-commercial/10 rounded-full mb-4">
          <HelpCircle className="w-8 h-8 text-commercial" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Guida e FAQ</h1>
        <p className="text-gray-500 mt-2">
          Tutto quello che devi sapere per usare al meglio il CRM
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Cerca nelle FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            selectedCategory === null
              ? "bg-commercial text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tutte
        </button>
        {categories.map((category) => {
          const Icon = categoryIcons[category] || HelpCircle;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-commercial text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon size={16} />
              {category}
            </button>
          );
        })}
      </div>

      {/* Quick Start Guide */}
      {!searchQuery && !selectedCategory && (
        <div className="bg-gradient-to-r from-commercial/5 to-commercial/10 rounded-xl p-6 border border-commercial/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="text-commercial" size={20} />
            Guida Rapida
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  1
                </div>
                <h3 className="font-medium">Contatta il Lead</h3>
              </div>
              <p className="text-sm text-gray-600">
                Chiama il lead e clicca &quot;Ho Chiamato&quot; per registrare l&apos;esito.
                Lo stato si aggiornerà automaticamente.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">
                  2
                </div>
                <h3 className="font-medium">Identifica i Target</h3>
              </div>
              <p className="text-sm text-gray-600">
                Se il lead è interessato, segnalo come &quot;Target&quot; per seguirlo con
                priorità.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                  3
                </div>
                <h3 className="font-medium">Chiudi la Vendita</h3>
              </div>
              <p className="text-sm text-gray-600">
                Quando firma il contratto, segnalo come &quot;Iscritto&quot;. Il sistema
                chiederà conferma.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFAQ.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              Nessuna domanda trovata per &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          filteredFAQ.map((item, index) => {
            const isOpen = openItems.has(index);
            const Icon = categoryIcons[item.category] || HelpCircle;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-commercial/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-commercial" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-commercial uppercase tracking-wide">
                        {item.category}
                      </span>
                      <h3 className="font-medium text-gray-900">
                        {item.question}
                      </h3>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="pl-13 ml-13 border-l-2 border-commercial/20 pl-4 ml-12">
                      <p className="text-gray-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact Support */}
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <Phone className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="font-medium text-gray-900 mb-1">
          Hai altre domande?
        </h3>
        <p className="text-sm text-gray-600">
          Contatta il tuo supervisore o l&apos;amministratore del sistema per
          assistenza.
        </p>
      </div>
    </div>
  );
}
