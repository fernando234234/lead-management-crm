# Guida all'Importazione Lead

> Ultimo aggiornamento: 28 Gennaio 2026

Questa guida spiega come importare lead nel sistema CRM tramite file CSV o Excel.

---

## Indice

1. [Panoramica del Processo](#panoramica-del-processo)
2. [Preparare il File](#preparare-il-file)
3. [Usare il Template CSV](#usare-il-template-csv)
4. [Processo di Importazione](#processo-di-importazione)
5. [Gestione degli Errori](#gestione-degli-errori)
6. [Correzioni Interattive](#correzioni-interattive)
7. [FAQ e Problemi Comuni](#faq-e-problemi-comuni)

---

## Panoramica del Processo

L'importazione segue un processo in 5 fasi con validazione a ogni passaggio:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   CARICA     │ -> │   MAPPA      │ -> │  ANTEPRIMA   │ -> │  CORREZIONI  │ -> │   IMPORTA    │
│    FILE      │    │   COLONNE    │    │    DATI      │    │ (se needed)  │    │    LEAD      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Validazioni Automatiche

| Fase | Cosa Controlla | Azione |
|------|----------------|--------|
| **Struttura** | Formato file, colonne corrette, campo "nome" presente | Blocca se errato |
| **Dati** | Corsi e commerciali esistenti | Mostra avvisi con suggerimenti |
| **Qualità** | Email/telefono presenti, duplicati | Avvisa ma permette di procedere |

---

## Preparare il File

### Formato Supportati
- **CSV** (consigliato) - Codifica UTF-8
- **Excel** (.xlsx, .xls)

### Colonne Richieste

| Colonna CSV | Campo Sistema | Obbligatorio | Note |
|-------------|---------------|--------------|------|
| `nome` | Nome lead | **SI** | Nome e cognome del lead |
| `email` | Email | No | Almeno email O telefono consigliato |
| `telefono` | Telefono | No | Almeno email O telefono consigliato |
| `corso` | Corso | No | Nome del corso (es. "Graphic Design") |
| `campagna` | Campagna | No | Nome campagna marketing |
| `stato` | Stato | No | NUOVO, CONTATTATO, IN_TRATTATIVA, ISCRITTO, PERSO |
| `note` | Note | No | Note aggiuntive |
| `assegnato_a` | Commerciale | No | Nome del commerciale (es. "Simone") |

### Esempio File CSV

```csv
nome,email,telefono,corso,campagna,stato,note,assegnato_a
Mario Rossi,mario.rossi@email.com,3331234567,Graphic Design,Meta Gennaio 2026,NUOVO,,Simone
Laura Bianchi,laura.b@gmail.com,,UX/UI Design,Google Ads,CONTATTATO,Richiamata il 15/01,Marcella
Giuseppe Verdi,,3289876543,Python,,NUOVO,Interessato al corso serale,
```

---

## Usare il Template CSV

### Scaricare il Template

1. Vai su **Admin > Lead**
2. Clicca **Importa Lead**
3. Clicca **Scarica Template**

Il template contiene:
- Intestazioni corrette
- Righe di esempio
- Formato corretto per ogni campo

### Convertire Dati da Altri Formati

Se hai dati in un formato diverso, puoi usare un LLM (ChatGPT, Claude) per convertirli:

1. Nel modal di importazione, clicca **Copia Istruzioni per LLM**
2. Incolla le istruzioni in ChatGPT o Claude
3. Aggiungi i tuoi dati
4. L'LLM li convertirà nel formato corretto

---

## Processo di Importazione

### Fase 1: Caricamento File

- Trascina il file nel box o clicca per selezionare
- Formati accettati: CSV, XLSX, XLS
- Il sistema legge automaticamente le intestazioni

### Fase 2: Mappatura Colonne

- Il sistema tenta di mappare automaticamente le colonne
- Verifica che ogni colonna sia associata correttamente
- Il campo **Nome** è obbligatorio

### Fase 3: Anteprima

- Vedi un'anteprima dei primi 5 lead
- Controlla che i dati siano corretti
- Vedi eventuali errori di validazione

### Fase 4: Correzioni (se necessario)

Se il sistema trova corsi o commerciali non riconosciuti, mostra una schermata di correzione:

```
⚠️ CORSO "Marketing Pro" (15 lead)
   ○ Crea nuovo corso "Marketing Pro"
   ● Usa esistente: "Marketing Base" (85% simile)
   ○ Usa esistente: "Marketing" (72% simile)

⚠️ COMMERCIALE "Simone R." (8 lead)  
   ○ Lascia non assegnati
   ● Assegna a: "Simone" (92% simile)
```

Per ogni valore non riconosciuto, puoi:
- **Creare nuovo** - Il corso verrà creato automaticamente
- **Usare esistente** - I lead useranno il corso/commerciale selezionato
- **Lasciare non assegnati** (solo commerciali) - I lead potranno essere assegnati dopo

### Fase 5: Importazione

Dopo aver confermato tutte le scelte, clicca **Importa con correzioni** per completare.

---

## Gestione degli Errori

### Errori Bloccanti (Struttura)

Questi errori impediscono l'importazione:

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| "Campi non riconosciuti: X, Y, Z" | File con colonne diverse dal template | Usa il template CSV |
| "Campo 'name' mancante" | Colonna nome assente | Aggiungi colonna "nome" |
| "NESSUN lead ha email o telefono" | Mappatura colonne errata | Verifica la mappatura colonne |

### Avvisi (Non Bloccanti)

Questi avvisi permettono di procedere:

| Avviso | Significato | Azione |
|--------|-------------|--------|
| "X lead senza nome" | Alcuni lead non hanno nome | Verranno saltati |
| "X% lead senza contatto" | Molti lead senza email/telefono | Verifica mappatura |
| "Corso non riconosciuto" | Corso non esiste nel sistema | Crea nuovo o seleziona esistente |
| "Commerciale non riconosciuto" | Nome commerciale non trovato | Assegna ad altro o lascia vuoto |

---

## Correzioni Interattive

### Come Funziona il Matching Fuzzy

Il sistema usa un algoritmo di similarità per suggerire corrispondenze:

- **90-100%**: Quasi certamente lo stesso (es. "Simone" vs "simone")
- **70-89%**: Probabile corrispondenza (es. "Simone R." vs "Simone")
- **50-69%**: Possibile corrispondenza (es. "Marketing Pro" vs "Marketing Base")
- **<50%**: Nessun suggerimento mostrato

### Esempio Pratico

**Nel file CSV hai:** `Marketing Digitale`

**Nel sistema esistono:**
- Marketing Base (65% simile)
- Digital Marketing (72% simile)
- Social Media Marketing (45% simile - non mostrato)

**Opzioni:**
1. Clicca "Crea nuovo corso" → Verrà creato "Marketing Digitale"
2. Clicca "Digital Marketing" → Tutti i lead useranno "Digital Marketing"

### Stato Visivo

- **Bordo grigio**: Nessuna scelta fatta (devi selezionare)
- **Bordo verde**: Scelta confermata
- **Pulsante disabilitato**: Devi completare tutte le scelte

---

## FAQ e Problemi Comuni

### Q: Posso importare lo stesso lead due volte?

**A:** Si, il sistema non blocca i duplicati. Verifica prima di importare che non ci siano lead già presenti.

### Q: Cosa succede se il corso non esiste?

**A:** Puoi scegliere di:
- Crearlo automaticamente (verrà creato con prezzo 0)
- Usare un corso esistente simile

### Q: Il commerciale "Mario" non viene trovato, perché?

**A:** Il sistema cerca corrispondenze esatte o simili tra:
- Nome utente (es. "simone")
- Nome completo (es. "Simone Cringoli")

Verifica come è registrato il commerciale nel sistema.

### Q: Posso correggere i dati dopo l'importazione?

**A:** Si, puoi modificare ogni lead singolarmente dalla pagina Lead.

### Q: Quanti lead posso importare alla volta?

**A:** Non c'è un limite tecnico, ma per performance consigliamo:
- Fino a 1.000 lead: Nessun problema
- 1.000-5.000: Potrebbe richiedere qualche minuto
- >5.000: Considera di dividere in più file

### Q: Il file Excel non viene letto correttamente

**A:** Prova a:
1. Salvare come CSV
2. Verificare che non ci siano celle unite
3. Controllare che la prima riga siano le intestazioni

---

## Riferimenti Tecnici

### Endpoint API

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/leads/template` | GET | Scarica template CSV |
| `/api/leads/import/validate` | POST | Valida dati e trova corrispondenze fuzzy |
| `/api/leads/import` | POST | Importa lead nel database |

### File Sorgente

| File | Scopo |
|------|-------|
| `src/components/ui/ImportModal.tsx` | UI del wizard di importazione |
| `src/lib/import.ts` | Parsing file e validazione client-side |
| `src/app/api/leads/import/route.ts` | API importazione con validazione struttura |
| `src/app/api/leads/import/validate/route.ts` | API validazione fuzzy matching |

---

## Changelog

| Data | Modifica |
|------|----------|
| 28/01/2026 | Aggiunta correzioni interattive con fuzzy matching |
| 28/01/2026 | Migliorata validazione struttura file |
| 22/01/2026 | Creazione iniziale sistema importazione |
