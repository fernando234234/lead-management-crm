# Guida alla Gestione Spese Campagne

> Ultimo aggiornamento: Gennaio 2026

---

## Panoramica

Il sistema di gestione spese permette di tracciare i costi delle campagne marketing per **periodi specifici**. Invece di un singolo budget, ogni campagna puo avere **multipli record di spesa** con date di inizio e fine.

### Vantaggi
- Tracciamento preciso dei costi nel tempo
- Filtro per periodo su tutte le pagine
- Calcolo ROI e CPL per periodi specifici
- Storico completo delle spese per campagna

---

## Come Funziona

### Struttura
```
Campagna: "Facebook Ads Corso Excel"
├── Spesa 1: Gen 1-31, €2,000
├── Spesa 2: Feb 1-28, €3,500
└── Spesa 3: Mar 1-31, €4,200
    Totale: €9,700
```

Ogni record di spesa ha:
- **Data Inizio** (obbligatoria)
- **Data Fine** (opzionale - lasciare vuota se in corso)
- **Importo** (obbligatorio)
- **Note** (opzionale)

---

## Guida Passo-Passo

### 1. Creare una Nuova Campagna

1. Vai su **Marketing → Campagne**
2. Clicca **"Nuova Campagna"**
3. Compila i campi:
   - Nome Campagna
   - Piattaforma (Meta, LinkedIn, Google Ads, TikTok)
   - Corso associato
   - Stato (Attiva, Bozza, In Pausa, Completata)
   - Data Inizio / Fine campagna
4. Clicca **"Crea Campagna"**

> **Nota:** La campagna viene creata con €0 di spesa. Aggiungi le spese separatamente.

---

### 2. Aggiungere Spese a una Campagna

1. Vai su **Marketing → Campagne**
2. Clicca l'icona **matita** sulla campagna da modificare
3. Seleziona la tab **"Gestione Spese"**
4. Clicca **"Aggiungi Spesa"**
5. Compila:
   - **Data Inizio**: quando inizia questo periodo di spesa
   - **Data Fine**: quando termina (lascia vuoto se in corso)
   - **Importo**: costo in Euro
   - **Note**: descrizione opzionale (es. "Budget mensile Gennaio")
6. Clicca **"Salva"**

---

### 3. Modificare o Eliminare una Spesa

Nella tab **"Gestione Spese"**:
- Clicca l'icona **matita** per modificare
- Clicca l'icona **cestino** per eliminare

Il totale viene ricalcolato automaticamente.

---

### 4. Filtrare per Periodo

Su tutte le pagine Marketing e Admin:

1. Usa il **filtro date** in alto a destra
2. Seleziona un preset (Ultimo Mese, Ultimi 3 Mesi, ecc.) o date personalizzate
3. I dati mostrati rifletteranno solo le spese nel periodo selezionato

**Logica di filtro:**
- Vengono incluse le spese il cui periodo **si sovrappone** con il filtro selezionato
- Es: Filtro "Gennaio 2026" include spese con data 15 Gen - 15 Feb

---

## Pagine con Filtro Date

| Pagina | Percorso | Cosa Filtra |
|--------|----------|-------------|
| **Costi Marketing** | Marketing → Costi | Spese campagne, CPL, totali |
| **ROI Marketing** | Marketing → ROI | Spese e ricavi per calcolo ROI |
| **Report Admin** | Admin → Report | Tutte le statistiche finanziarie |
| **Dashboard Admin** | Admin → Dashboard | Metriche finanziarie |

---

## Esempi Pratici

### Esempio 1: Campagna con Spesa Mensile

Campagna "Facebook - Corso Excel" attiva da 3 mesi:

| Periodo | Importo | Note |
|---------|---------|------|
| 1-31 Gen 2026 | €1,500 | Budget gennaio |
| 1-28 Feb 2026 | €2,000 | Aumento budget |
| 1-31 Mar 2026 | €1,800 | Budget marzo |

**Totale campagna:** €5,300

### Esempio 2: Verifica ROI Mensile

Per vedere il ROI di Febbraio:
1. Vai su **Marketing → ROI**
2. Imposta filtro: 1 Feb - 28 Feb
3. Vedrai:
   - Spese: solo quelle di febbraio (€2,000)
   - Ricavi: solo iscrizioni di febbraio
   - ROI: calcolato su quel periodo

---

## FAQ

### D: Posso avere spese sovrapposte?
**R:** Si, il sistema le somma. Utile se hai costi diversi nello stesso periodo (es. creativita + media buying).

### D: Cosa succede se non metto la data fine?
**R:** La spesa viene considerata "in corso" e inclusa in tutti i filtri che partono dalla data inizio.

### D: Come faccio a vedere il totale storico?
**R:** Rimuovi tutti i filtri date. Vedrai il totale di tutte le spese.

### D: Posso modificare spese vecchie?
**R:** Si, tutte le spese sono modificabili. I totali vengono ricalcolati automaticamente.

---

## Metriche Calcolate

| Metrica | Formula |
|---------|---------|
| **Spesa Totale** | Somma di tutti i record di spesa (filtrati per data) |
| **CPL** | Spesa Totale / Numero Lead |
| **ROI** | (Ricavi - Spesa) / Spesa × 100 |
| **Conversione** | Lead Iscritti / Lead Totali × 100 |

---

## Supporto

Per problemi o domande:
- Contatta l'amministratore di sistema
- Verifica che le date siano nel formato corretto (GG/MM/AAAA)
