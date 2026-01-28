import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering since we access request.url
export const dynamic = "force-dynamic";

// =============================================================================
// LLM INSTRUCTIONS FOR DATA CONVERSION
// =============================================================================
const LLM_CONVERSION_INSTRUCTIONS = `
# Lead CRM - Istruzioni per Conversione Dati CSV

## STEP 0: ANALISI PRELIMINARE (ESEGUI SEMPRE PRIMA)

### Rilevamento Automatico Delimitatore
Analizza la prima riga del file:
- Se contiene più \`;\` che \`,\` → delimitatore è punto e virgola
- Se contiene più \`,\` che \`;\` → delimitatore è virgola
- Se contiene TAB (\\t) → delimitatore è tab
**Comunica all'utente**: "Ho rilevato che il file usa [delimitatore] come separatore."

### Rilevamento Encoding
Cerca caratteri corrotti come: �, ï¿½, Ã, â€
**Se trovati**: "Ho rilevato problemi di encoding (es: 'Tarab�' invece di 'Tarabò'). Provo a correggere i caratteri italiani comuni. Verifica i nomi nel report finale."

### Rilevamento Colonne Extra
Conta le colonne nell'header vs colonne attese (8).
**Se diverse**: "L'header ha [N] colonne invece di 8. Colonne extra rilevate: [lista]. Le rimuoverò."

### Rilevamento Righe Vuote
**Se presenti righe vuote o solo delimitatori**: "Ho trovato [N] righe vuote che verranno ignorate."

---

## STEP 1: FORMATO OUTPUT RICHIESTO

- **Delimitatore**: virgola (,) - MAI punto e virgola (;)
- **Encoding**: UTF-8 con BOM
- **Fine riga**: CRLF (\\r\\n)
- **Valori con virgole/apici**: racchiudere tra doppi apici, escape apici con ""
- **Esattamente 8 colonne**: né più né meno

---

## STEP 2: COLONNE (in ordine esatto)

| # | Colonna | Obbligatorio | Formato | Note |
|---|---------|--------------|---------|------|
| 1 | nome | **SI** | Testo | Nome completo del lead |
| 2 | email | No | email@dominio.ext | Validare formato |
| 3 | telefono | No | Testo | Formato +39 XXX XXXXXXX preferito |
| 4 | corso | No | Testo | Match case-insensitive, auto-creazione se non esiste |
| 5 | campagna | No | Testo | Match case-insensitive con campagne esistenti |
| 6 | stato | No | Enum | NUOVO, CONTATTATO, IN_TRATTATIVA, ISCRITTO, PERSO |
| 7 | note | No | Testo | Note libere |
| 8 | assegnato_a | No | Testo | Nome O username commerciale |

---

## STEP 3: MAPPATURA STATI

### Conversioni Automatiche (applica senza chiedere)
| Input (case-insensitive) | Output |
|--------------------------|--------|
| SI, Sì, sì, si, S, iscritto, enrolled, won, vinto, confermato, completato, chiuso | ISCRITTO |
| In trattativa, in_trattativa, trattativa, negotiating, in corso, pending, attivo | IN_TRATTATIVA |
| Contattato, contacted, chiamato, reached, richiamato, risposto | CONTATTATO |
| Perso, lost, no, rifiutato, rejected, annullato, cancellato, non interessato | PERSO |
| Nuovo, new, da contattare, lead, prospect, (vuoto), (null) | NUOVO |

### Se stato non riconosciuto
**FERMARSI e chiedere**: "Stato '[valore]' trovato [N] volte. Non riesco a mapparlo automaticamente. Opzioni:
1. Mappalo come NUOVO (default)
2. Mappalo come [suggerisci basandoti sul contesto]
3. Dimmi tu come mapparlo"

---

## STEP 4: PULIZIA NOMI (CRITICO)

### Capitalizzazione Corretta
Applica Title Case intelligente:
- \`MARIO ROSSI\` → \`Mario Rossi\`
- \`mario rossi\` → \`Mario Rossi\`
- \`gioele vimercati\` → \`Gioele Vimercati\`
- \`maria luisa caracciolo\` → \`Maria Luisa Caracciolo\`

### Preserva Particelle Nobiliari/Preposizioni (lowercase)
- \`di\`, \`de\`, \`della\`, \`del\`, \`van\`, \`von\` → restano minuscole se nel mezzo
- \`Simona Lilla Di Fede\` → \`Simona Lilla di Fede\`
- \`Serena De Lizia\` → \`Serena De Lizia\` (De a inizio cognome resta maiuscolo)

### Rilevamento Anomalie (CHIEDERE ALL'UTENTE)
1. **Nomi duplicati/ripetuti**: \`Marah Ricciardi Ricciardi\` 
   → "Nome sospetto: 'Ricciardi' appare due volte. È corretto o è un errore di data entry?"
   
2. **Nomi molto corti** (< 3 caratteri per parte):
   → "Nome sospetto: '[nome]' sembra incompleto. Verificare?"

3. **Nomi con numeri o caratteri speciali**:
   → "Nome sospetto: '[nome]' contiene caratteri inusuali. È corretto?"

### Correzione Encoding Caratteri Italiani
| Corrotto | Corretto |
|----------|----------|
| Ã  | à |
| Ã¨ | è |
| Ã© | é |
| Ã¬ | ì |
| Ã² | ò |
| Ã¹ | ù |
| � (replacement char) | [SEGNALA - impossibile recuperare] |

**Se trovi caratteri non recuperabili**: "Riga [N]: il nome '[nome]' contiene caratteri corrotti non recuperabili. Testo originale: '[raw]'. Come procedo?"

---

## STEP 5: VALIDAZIONE COMMERCIALI

### Prima di processare, CHIEDI ALL'UTENTE:
"Ho trovato questi nomi nella colonna 'assegnato_a': [lista unica].
Per favore conferma quali sono commerciali validi nel sistema, oppure forniscimi la lista dei commerciali esistenti."

### Se l'utente fornisce la lista
Mappa i nomi trovati ai commerciali validi (match case-insensitive, anche parziale).
**Se non trova match**: "Il commerciale '[nome]' non corrisponde a nessuno nella lista. Lascio il campo vuoto per questa riga."

### Se l'utente non fornisce la lista
"Procedo mantenendo i nomi come sono. Il sistema proverà a matchare automaticamente - se non trova corrispondenza, il lead sarà importato senza assegnazione."

---

## STEP 6: GESTIONE CAMPI MANCANTI

### Campo "nome" mancante (BLOCCANTE)
**NON PROCEDERE** - chiedi:
"Riga [N]: nome mancante. Opzioni:
1. Usa l'email come nome (se presente)
2. Salta questa riga
3. Inserisci placeholder '[Da Completare]'
4. Dimmi tu cosa inserire"

### Campo "email" con formato invalido
- Sposta il valore nelle note con prefisso "[Email non valida]: "
- Lascia il campo email vuoto

### Campo "stato" vuoto
- Imposta automaticamente: NUOVO
- Menziona nel report: "[N] righe senza stato → impostato NUOVO"

### Campi completamente vuoti (email, telefono, campagna, note)
- Lascia vuoti, non inventare dati
- Non segnalare (è normale che manchino)

---

## STEP 7: ESEMPIO CONVERSIONE COMPLETO

### Input (problematico)
\`\`\`
nome;email;telefono;corso;campagna;stato;note;assegnato_a;;
Piera Pia Pisani;;;Masterclass Graphic Web Design;;SI;;Silvana;;
gioele vimercati;;;After Effects;;SI;;Simone;;
Flavio Tarab�;;;Masterclass Graphic Web Design;;In trattativa;;Silvana;;
maria luisa Caracciolo;;;Interior Planner;;SI;;Natascia;;
Marah Ricciardi Ricciardi;;;Interior Planner;;SI;;Natascia;;

\`\`\`

### Analisi (da comunicare all'utente)
\`\`\`
ANALISI PRELIMINARE:
- Delimitatore rilevato: punto e virgola (;)
- Colonne extra: 2 colonne vuote alla fine (verranno rimosse)
- Righe vuote: 1 (verrà ignorata)
- Encoding: carattere corrotto trovato in riga 4 ('Tarab�')

ANOMALIE NOMI:
- Riga 2: 'gioele vimercati' tutto minuscolo → correggo in 'Gioele Vimercati'
- Riga 4: 'Tarab�' contiene carattere corrotto → impossibile recuperare automaticamente
- Riga 5: 'maria luisa' minuscolo → correggo in 'Maria Luisa'
- Riga 6: 'Ricciardi Ricciardi' - cognome ripetuto, possibile errore?

STATI DA CONVERTIRE:
- 'SI' (4 occorrenze) → ISCRITTO
- 'In trattativa' (1 occorrenza) → IN_TRATTATIVA

COMMERCIALI TROVATI: Silvana, Simone, Natascia
→ Confermi che esistono nel sistema?
\`\`\`

### Output (dopo conferme utente)
\`\`\`
nome,email,telefono,corso,campagna,stato,note,assegnato_a
Piera Pia Pisani,,,Masterclass Graphic Web Design,,ISCRITTO,,Silvana
Gioele Vimercati,,,After Effects,,ISCRITTO,,Simone
Flavio Tarabò,,,Masterclass Graphic Web Design,,IN_TRATTATIVA,,Silvana
Maria Luisa Caracciolo,,,Interior Planner,,ISCRITTO,,Natascia
Marah Ricciardi,,,Interior Planner,,ISCRITTO,,Natascia
\`\`\`

---

## STEP 8: CHECKLIST FINALE (verifica tutto)

1. [ ] Delimitatore: virgola (,)
2. [ ] Esattamente 8 colonne per riga
3. [ ] Nessuna riga vuota
4. [ ] Stati: solo NUOVO/CONTATTATO/IN_TRATTATIVA/ISCRITTO/PERSO
5. [ ] Nomi: Title Case corretto, no caratteri corrotti
6. [ ] Email: formato valido o vuoto
7. [ ] Nessun dato inventato
8. [ ] Encoding: UTF-8

---

## STEP 9: OUTPUT FINALE

### 1. CSV Convertito
Fornisci il CSV completo, pronto per copia/incolla o salvataggio come file .csv

### 2. Report di Conversione
\`\`\`
REPORT CONVERSIONE
==================
Righe input: [N]
Righe output: [N]
Righe skippate: [N] (se > 0, elenca motivi)

CORREZIONI APPLICATE:
- Delimitatore: ; → ,
- Colonne rimosse: [N]
- Nomi corretti (capitalizzazione): [N]
- Stati convertiti: SI → ISCRITTO ([N]), In trattativa → IN_TRATTATIVA ([N])
- Encoding fix: [lista nomi corretti]

WARNING (richiedono verifica):
- Riga X: [descrizione problema]

COMMERCIALI MAPPATI:
- Silvana → [confermato/non trovato]
- Simone → [confermato/non trovato]
- ...
\`\`\`

---

## NOTE IMPORTANTI

1. **MAI inventare dati** - se manca, lascia vuoto o chiedi
2. **MAI procedere con dubbi sui nomi** - chiedi conferma
3. **MAI assumere mappature stati** non in lista - chiedi
4. **SEMPRE mostrare anteprima** prima del CSV finale se ci sono anomalie
5. **SEMPRE generare report** anche se tutto ok
`;

// =============================================================================
// CSV TEMPLATE HEADERS AND EXAMPLE DATA
// =============================================================================
const CSV_HEADERS = [
  "nome",
  "email", 
  "telefono",
  "corso",
  "campagna",
  "stato",
  "note",
  "assegnato_a",
];

const EXAMPLE_ROWS = [
  [
    "Mario Rossi",
    "mario.rossi@email.it",
    "+39 333 1234567",
    "Corso Web Development",
    "Campagna Facebook Marzo",
    "NUOVO",
    "Interessato al corso serale",
    "commerciale@azienda.it",
  ],
  [
    "Laura Bianchi",
    "laura.bianchi@email.it",
    "+39 340 9876543",
    "Corso Data Science",
    "Campagna LinkedIn Q1",
    "CONTATTATO",
    "Ha chiesto informazioni sui prezzi",
    "",
  ],
  [
    "Giuseppe Verdi",
    "g.verdi@example.com",
    "+39 345 1112233",
    "",
    "",
    "NUOVO",
    "",
    "",
  ],
];

// =============================================================================
// FIELD SPECIFICATIONS (for JSON response)
// =============================================================================
const FIELD_SPECS = {
  nome: {
    required: true,
    type: "string",
    description: "Nome completo del lead",
    example: "Mario Rossi",
    validation: "Non vuoto, max 255 caratteri",
  },
  email: {
    required: false,
    type: "string",
    description: "Indirizzo email",
    example: "mario.rossi@email.it",
    validation: "Formato email valido (xxx@xxx.xxx)",
  },
  telefono: {
    required: false,
    type: "string", 
    description: "Numero di telefono",
    example: "+39 333 1234567",
    validation: "Qualsiasi formato, preferire +39 XXX XXXXXXX",
  },
  corso: {
    required: false,
    type: "string",
    description: "Nome del corso di interesse",
    example: "Corso Web Development",
    validation: "Match case-insensitive con corsi esistenti, o creazione automatica",
  },
  campagna: {
    required: false,
    type: "string",
    description: "Nome della campagna marketing di provenienza",
    example: "Campagna Facebook Marzo",
    validation: "Match case-insensitive con campagne esistenti",
  },
  stato: {
    required: false,
    type: "enum",
    description: "Stato del lead nel funnel",
    example: "NUOVO",
    validation: "NUOVO | CONTATTATO | IN_TRATTATIVA | ISCRITTO | PERSO",
    default: "NUOVO",
    mappings: {
      "ISCRITTO": ["SI", "Sì", "si", "iscritto", "enrolled", "won", "vinto", "confermato"],
      "IN_TRATTATIVA": ["In trattativa", "trattativa", "negotiating", "in corso", "pending"],
      "CONTATTATO": ["Contattato", "contacted", "chiamato", "reached"],
      "PERSO": ["Perso", "lost", "no", "rifiutato", "rejected", "annullato"],
      "NUOVO": ["Nuovo", "new", "da contattare", "lead", ""],
    },
  },
  note: {
    required: false,
    type: "string",
    description: "Note aggiuntive sul lead",
    example: "Interessato al corso serale",
    validation: "Testo libero",
  },
  assegnato_a: {
    required: false,
    type: "string",
    description: "Nome o username del commerciale assegnato",
    example: "Mario Bianchi",
    validation: "Match case-insensitive con nome o username utente esistente (ruolo COMMERCIAL)",
  },
};

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

// GET /api/leads/template - Download CSV template or get specs
// Query params:
//   ?format=csv (default) - Download CSV template file
//   ?format=json - Get field specifications as JSON
//   ?format=llm - Get LLM conversion instructions as text
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    switch (format) {
      case "json":
        return NextResponse.json({
          fields: FIELD_SPECS,
          headers: CSV_HEADERS,
          examples: EXAMPLE_ROWS,
          csvFormat: {
            delimiter: ",",
            encoding: "UTF-8 with BOM",
            lineEnding: "CRLF (\\r\\n)",
            quoting: "Double quotes for values containing comma, quote, or newline",
          },
        });

      case "llm":
        return new NextResponse(LLM_CONVERSION_INSTRUCTIONS, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });

      case "csv":
      default:
        // Build CSV content
        const csvRows = [
          CSV_HEADERS.join(","),
          ...EXAMPLE_ROWS.map((row) =>
            row.map((value) => {
              if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(",")
          ),
        ];

        // Add BOM for Excel compatibility with UTF-8
        const BOM = "\uFEFF";
        const csvContent = BOM + csvRows.join("\r\n");

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=template_importazione_lead.csv",
            "Cache-Control": "no-cache",
          },
        });
    }
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Errore durante la generazione del template" },
      { status: 500 }
    );
  }
}
