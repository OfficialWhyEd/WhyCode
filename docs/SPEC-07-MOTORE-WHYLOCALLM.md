# SPEC-07 - Motore WhyLocalLM

Progetto: WhyCode.

Documento: specifica del motore AI. Come WhyCode usa WhyLocalLM per tutti i suoi livelli.

Data: 17/10/2026.

Stato: base di lavoro per la Fase 0. Ogni numero qui dentro viene da misure vere, da file di memoria o da calcoli dichiarati. Niente numeri inventati.

Fonti:

- `E:\Dev\WhyCode\PROGETTO.md` (visione approvata, parole di Whyed).
- Memoria `whyobliter-whylocallm.md` (stato vero al 15/10/2026).
- Memoria `system-one-in-why.md` (10/10/2026).
- Memoria `agente-locale-why-hermes.md` (09/10/2026, misure di velocita').
- Guide ufficiali llama.cpp per GBNF e per il server (verificate il 17/10/2026).

In una riga: WhyCode parla con WhyLocalLM attraverso una busta fissa, un registro compatto e grammatiche GBNF, e tutto funziona anche senza il modello, perche' il modello e' un'accelerazione, non una dipendenza.

---

## 1. Scopo

Il motore AI di WhyCode e' il modello locale di Whyed: WhyLocalLM. Niente cloud obbligatorio. I modelli frontier sono opzionali, come maestri (sezione 7). Tutto gira sul PC di Whyed.

WhyCode e il modello sono due cose diverse:

- WhyCode e' il sistema: kernel, comprensione, spazio quantico, sintesi, registro. Le sue regole di base girano senza modello (Fase 0, PROGETTO.md sezione 6 punto 5).
- WhyLocalLM e' il motore che esegue i compiti che richiedono un modello: capire codice mai visto, generare varianti, scrivere, rivedere, spiegare.

### 1.1 Com'e' organizzato il dialogo

Il dialogo non e' chat libera. E' fatto di job.

    WhyCode core (Fase 0, zero modelli)
       |
       +-- pianificatore a regole pure (intento, vincoli, test)
       |
       +-- MOTORE (questa specifica): job JSON -> porta 1235 -> risposta in BUSTA
       |        |
       |        +-- smistamento: System One (Kev-4B) o regole fisse
       |        +-- grammatiche: archivi *.gbnf per ruolo (sezione 6)
       |        +-- budget token e timeout per ruolo (sezione 3)
       |        +-- coda di lavoro con priorita' (sezione 8)
       |
       +-- REGISTRO (stile WhyObliter): jsonl + REPORT
       |
       +-- KB: schede dei linguaggi studiati, esempi d'oro

Ogni scambio e' un job. Un job ha: un ruolo (sezione 3), un modello, un budget, un formato (sezione 4), una grammatica quando serve (sezione 6), e un esito scritto nel registro. Il job segue la stessa disciplina di WhyObliter: una istruzione per riga, parametri tipizzati, REPORT.

### 1.2 Regole del dialogo

1. Un job, un ruolo. I ruoli non si mescolano mai in una sola chiamata.
2. Ogni job sceglie il modello piu' piccolo che basta (sezione 3.6).
3. Ogni risposta e' macchina-leggibile (BUSTA o JSON). La prosa libera solo per il ruolo spiegazione.
4. Ogni job scrive una riga di registro. Niente eccezioni.
5. Se il modello non c'e', il job va in coda. Il sistema non si blocca mai.
6. Le chiamate al modello passano sempre dalla facciata 1235 (che ha memoria e identita'). La porta 8080 e' il motore grezzo, si usa solo nel laboratorio (sezione 9).

### 1.3 Criteri di accettazione del motore (Fase 0)

Il motore e' pronto quando, con la sola lettura di questo documento, valgono queste cose:

1. Esiste un client che manda un job alla porta 1235 e legge la BUSTA di risposta.
2. Esistono almeno 3 grammatiche GBNF pronte: busta, registro, JSON di comprensione (sezione 6).
3. Un job con grammatica attiva non produce mai output fuori formato (test con 50 richieste).
4. Esiste il registro jsonl, con una riga per job, campi fissi (sezione 4.5).
5. Esiste il controllo RAM prima di ogni caricamento (regola dei 3 GB, sezione 8).
6. Con il motore spento, la Fase 0 di WhyCode continua a funzionare (regole pure, coda dei job).
7. La tabella delle misure (sezione 10) ha almeno 10 righe compilate.
8. Il system prompt fondativo (sezione 11) e' usato in ogni chiamata, senza modifiche a mano.

### 1.4 Pezzi da costruire (cartelle)

    E:\Dev\WhyCode\motore\
        client.mjs          cliente verso 1235 (job -> BUSTA)
        smistamento.mjs     scelta del modello per job (parla col System One)
        ram.mjs             controllo RAM libera, regola dei 3 GB
        coda.mjs            coda dei job, priorita', fascia notte
        registro.mjs        scrittura jsonl + REPORT
        grammatiche\
            busta0.gbnf
            registro0.gbnf
            comprensione.schema.json
        prompt\
            fondativo.md    (il testo della sezione 11)

I nomi sono proposta di questa spec. La Fase 0 puo' rinominare, ma non togliere i pezzi.

---

## 2. Il modello

### 2.1 Identita' e numeri verificati

Tutto da memoria `whyobliter-whylocallm.md` (15/10/2026) e `agente-locale-why-hermes.md` (09/10/2026).

| Voce | Valore | Fonte o data |
|---|---|---|
| Modello base | Qwen3.6-35B-A3B, quantizzazione Q4_K_M | memoria 15/10 |
| Variante "heretic" | `Qwen3.6-35B-A3B-heretic-Q4_K_M.gguf`, 19,78 GB | scaricata 14/10 alle 23:29 |
| Motore di esecuzione | ik_llama.cpp, build Thireus Zen3, hash verificato | memoria 15/10 |
| Decodifica | suffix (corpus costruito dalle conversazioni di Whyed) | memoria 09/10 |
| Velocita' testo | 17,24 tok/s | misurata 09/10, storica |
| Velocita' codice | 20,88 tok/s con decodifica suffix | misurata 09/10, storica |
| Confronto vecchio | 11,4 tok/s su LM Studio | misurata prima del 09/10 |
| RAM necessaria | circa 23 GB per il 35B | memoria 15/10 |
| RAM libera al 15/10 | circa 4,8 GB (il benchmark del 35B non partiva) | serviva riavvio del PC |
| VRAM | 2 GB | memoria 15/10 |
| Disco al 15/10 | C circa 2,8 GB liberi, E circa 1,3 GB liberi (urgente) | memoria 15/10 |
| Disco al 17/10 | E circa 220 GB liberi | stato attuale |
| Porta facciata | 1235, OpenAI-compatibile, identita' "Why", memoria, diario, segnali | memoria 15/10 |
| Porta motore | 8080 | memoria 15/10 |
| Modelli serviti | `why`, `why-veloce`, `why-potente`, con `tool_call: true` | opencode.json in WhyLocalLM |
| System One | Kev-4B in `decisore.mjs`, sceglie veloce o potente | 27/30 corretto contro 20/30 della regola a parole |

Nota di onesta': la variante heretic NON e' ancora il motore principale. `config.json` punta ancora al Qwen normale di LM Studio. Non c'e' prova che i pesi siano davvero abliterated (i metadata non bastano). L'attivazione si fa con confronto prima/dopo e rollback (sezione 12).

Nota di onesta' numero due: 17,24 e 20,88 sono misure storiche del 09/10. Oggi valgono come riferimento atteso, non come stato. La prima misura nuova va nella tabella della sezione 10.

### 2.2 Cosa sa fare bene

- Codice con decodifica suffix: 20,88 tok/s. Il corpus suffix cresce dalle conversazioni di Whyed, e la velocita' migliora con l'uso (memoria 09/10).
- Testo italiano: 17,24 tok/s.
- Compiti brevi e formattati: con memoria, diario e identita' sulla facciata 1235, il modello risponde bene a richieste corte con formato fisso. E' esattamente la forma dei job di WhyCode.
- Registro .wo: il modello vive dentro l'ecosistema WhyObliter. Il codice compatto lo parla gia'.

### 2.3 Cosa non sa fare bene

- Ragionamenti lunghi e concatenati: la velocita' e' modesta, ogni token di "pensiero" costa. Output oltre 2000 token diventano lenti (oltre 1 minuto e mezzo).
- Contesti enormi: la RAM della macchina e' il limite vero. Il 35B vuole circa 23 GB.
- Lavori in parallelo: il 35B e' uno alla volta. Sulla porta c'e' una coda, non un branco.
- Tool calling: il provider opencode `whylocallm` e' riconosciuto, ma l'uso reale degli strumenti NON e' collaudato (memoria 15/10). Fino a prova contraria, WhyCode usa il motore per testo e formato, non per azioni.
- Rifiuti e sicurezza: ridurre i falsi rifiuti e' un obiettivo del progetto heretic, ma "non dice mai no" non e' un risultato verificato. Si misura (WhyObliter, test `evaluate_refusals`).

### 2.4 Velocita' attesa per tipo di compito

Calcoli dichiarati: token di uscita diviso la velocita' storica (17,24 testo, 20,88 codice). Non sono misure nuove.

| Compito tipico | Token in uscita (budget) | Velocita' usata | Tempo atteso |
|---|---|---|---|
| Smistamento System One (scelta modello) | 8 | piccola, Kev-4B | sotto il secondo, da misurare |
| Spiegazione breve a Whyed | 250 | 17,24 tok/s | circa 15 secondi |
| Comprensione di un file medio | 800 | 17,24 tok/s | circa 46 secondi |
| Revisione di un diff | 500 | 17,24 tok/s | circa 29 secondi |
| Sintesi di una funzione | 2000 | 20,88 tok/s | circa 96 secondi |
| Tre varianti di un intento | 2100 (3 x 700) | 20,88 tok/s | circa 101 secondi |

Regola pratica: un job interattivo sta sotto i 60 secondi. Oltre, si va in coda per la fascia notte (sezione 8), salvo richiesta esplicita di Whyed.

---

## 3. Ruoli del modello in WhyCode

Cinque ruoli piu' uno smistatore. Un job, un ruolo. Il ruolo decide modello, prompt, budget e fallback.

Ruoli:

1. Comprensione: leggere codice ed esempi, capire cosa fanno.
2. Generazione varianti: il livello quantico, N realizzazioni possibili di un intento.
3. Sintesi: scrivere il codice finale, incastrato nel contesto.
4. Revisione: controllare quello che si e' scritto.
5. Spiegazione: raccontare a Whyed, in modo comprensibile.
6. Smistamento (System One): decidere chi fa il lavoro. Non produce contenuto.

### 3.1 Comprensione

A cosa serve: leggere sorgenti, esempi positivi e negativi, documentazione, frasi umane scritte male. Produrre il Modello di Comprensione (PROGETTO.md, Livello 1): cosa fa il codice, contratti, invarianti, casi di bordo, intenzioni. E' l'ingresso di tutto.

Modello: `why-veloce` di default. `why-potente` se il file supera 400 righe, se la lingua e' ignota al modello, o se il primo giro sbaglia semantica. System One non si usa qui (non produce contenuto).

Prompt di riferimento: template T1 (sezione 4.3). Risposta in JSON (sezione 6.4) o in BUSTA con corpo JSON.

Budget: input fino a 6000 token di codice per job (oltre si spezzetta, vedi sotto). Uscita massima 800 token.

Input lunghi: si spezzetta a finestre di 500 righe con 40 righe di sovrapposizione. Ogni finestra produce un JSON parziale. Una chiamata finale unisce i parziali. La fusione e' a regole, non a modello.

Se la risposta e' scadente:

1. Formato rotto: rilanciare con `json_schema` attivo (sezione 6.4). Non si corregge a mano.
2. Semantica sbagliata: rilanciare su `why-potente` con due controesempi presi dal file.
3. Ancora male: marcare `fiducia: bassa` e i campi incerti con [INCERTO]. Il compito passa a Whyed o al maestro (sezione 7). Mai inventare.

### 3.2 Generazione varianti (livello quantico)

A cosa serve: dato un intento e dei vincoli, produrre N realizzazioni possibili (idiomi, librerie, prestazioni, stile). Sono le "superposizioni" di PROGETTO.md, Livello 2. Il collasso sceglie poi con funzione deterministica.

Modello: `why-potente` di default. E' il cuore del progetto: la qualita' delle varianti vale il tempo. `why-veloce` solo per esplorazione economica di idiomi (snippet sotto 30 righe).

Prompt di riferimento: template T2 (sezione 4.3). Uscita: una BUSTA per variante, con chiamate separate e semi diversi (seed 1, 2, 3). Cosi' il registro e' pulito e il replay e' per-variante.

Budget: 3 varianti, massimo 700 token di uscita ognuna.

Se la risposta e' scadente:

1. Varianti troppo simili: cambiare seed e alzare la temperatura (parametro nella richiesta). Le varianti devono differire su un asse dichiarato: idioma, prestazioni, dipendenze.
2. Tutte povere: rilanciare su `why-potente` (se non lo era) con l'asse reso esplicito.
3. Ancora povere: spezzare l'intento in sotto-intenti e fare varianti per pezzo. Se non basta: maestro (sezione 7), registrato come esterno.

### 3.3 Sintesi

A cosa serve: scrivere il codice finale nel linguaggio target, incastrato nel contesto ospite (nomi, pattern, librerie presenti, stile). E' il Livello 3 di PROGETTO.md.

Modello: `why-potente` di default. La sintesi e' il lavoro piu' pesante e il piu' importante. `why-veloce` ammesso solo per boilerplate sotto 30 righe e per test di forma.

Prompt di riferimento: template T3 (sezione 4.3). Uscita in BUSTA, con il codice nel corpo. La BUSTA dice modello, lingua e fiducia. Il codice NON va in JSON (JSON e' per i dati, non per il codice).

Budget: massimo 2000 token di uscita per job. Codice oltre 150 righe: si spezza in funzioni, un job per funzione, un job di colla alla fine.

Se la risposta e' scadente:

1. Non compila: si rimanda al modello l'errore esatto del compilatore, una volta sola (retry guidato dall'errore, massimo 1).
2. Non si incastra (nomi, stile): si rilanciano 2 esempi dello stesso repo nel contesto e si chiede di nuovo, su `why-potente`.
3. Fallisce due volte: parte la revisione umana. Il fallimento va nel registro con l'esito e il motivo. Mai consegnare senza prova (PROGETTO.md sezione 6 punto 1).

### 3.4 Revisione

A cosa serve: controllare il codice scritto. Correttezza prima, poi incastro, prestazioni, stile (l'ordine e' di PROGETTO.md, Livello 2: la correttezza non si negozia). Controlla anche i formati dei job e le schede.

Modello: `why-veloce` per il controllo di formato e stile (economico). `why-potente` per semantica, sicurezza e casi di bordo.

Prompt di riferimento: template T4 (sezione 4.3). Uscita: BUSTA con righe fisse, una per criterio: `OK <criterio>` oppure `KO <criterio>: <motivo breve>`. Niente prosa.

Budget: massimo 500 token di uscita.

Se la risposta e' scadente:

1. Verdetto vago ("sembra ok"): rilanciare con la lista dei criteri numerata e l'obbligo di una riga per criterio.
2. Revisione incompleta su sicurezza: rilanciare su `why-potente` con il solo pezzo sospetto.
3. Il revisore non e' d'accordo con se stesso: vince la prova. Il test che passa e' il verdetto finale. Il revisore e' un aiuto, non un giudice.

### 3.5 Spiegazione (per Whyed)

A cosa serve: raccontare a Whyed cosa e' stato fatto, cosa e' cambiato, cosa resta aperto. E' l'unico ruolo che produce prosa.

Modello: `why-veloce`. La spiegazione e' corta per definizione.

Prompt di riferimento: template T5 (sezione 4.3). Uscita: BUSTA con corpo di massimo 3 frasi brevi. Le frasi sono corte perche' Whyed e' dislessico con ADHD: la regola sta nel prompt.

Budget: massimo 250 token di uscita.

Se la risposta e' scadente:

1. Troppo lunga: rilanciare con "massimo 3 frasi, 15 parole per frase".
2. Troppo tecnica: rilanciare con "spiega a una persona curiosa, non a un programmatore".
3. Mai usare la spiegazione per decisioni tecniche: quelle stanno nel registro e nel codice.

### 3.6 Smistamento (System One)

A cosa serve: scegliere il modello per ogni job. Ingresso: una riga di richiesta. Uscita: una parola: `veloce`, `potente`, oppure `rinvia`.

Modello: System One, Kev-4B in `decisore.mjs`. Gia' in uso su Why: prima le parole potenti, poi System One, se non risponde resta veloce (memoria 10/10). Su 30 gare: 27 corrette contro 20 della regola a parole.

Regole di smistamento (partenza, poi si tarano con le misure):

1. Input lungo (oltre 4000 token) o lingua poco vista: `potente`.
2. Controllo formato, revisione stile, spiegazione: `veloce`.
3. Sintesi e varianti: `potente`.
4. Job enormi (oltre 2000 token di uscita) o PC occupato: `rinvia` in fascia notte.

Budget: 8 token di uscita. Il System One e' piccolo: se non risponde entro il timeout breve, valgono le regole qui sopra senza di lui (potente per sintesi e varianti, veloce per il resto). Mai bloccarsi sullo smistamento.

Aggiornamento: quando esce un decision model migliore, va in arena e, se vince, si cambia solo `config.json system_one.modello` (memoria 10/10). La sentinella lo segnala ogni giorno.

---

## 4. Formato di scambio

### 4.1 Regole generali

1. La prima riga della risposta e' sempre riconoscibile: `WHYCODE-1` se e' una BUSTA, `{` se e' JSON puro.
2. Niente prosa fuori formato. Zero preamboli, zero conclusioni, zero ringraziamenti.
3. JSON quando c'e' una macchina a valle (comprensione, registro, schede). BUSTA quando c'e' testo o codice con metadati (sintesi, varianti, revisione, spiegazione).
4. Il budget token si rispetta. Se il contenuto non basta, si taglia e si segna `[TRONCATO]` nell'ultima riga del corpo.
5. Una scelta, una riga di registro. Il registro e' la memoria del sistema.
6. Ogni job ha un id e un hash dell'ingresso. Stesso id non si esegue due volte: si ripesca dal registro (questo e' il replay deterministico del collasso).

### 4.2 La BUSTA (formato unico di risposta)

    WHYCODE-1
    RUOLO <comprensione|varianti|sintesi|revisione|spiegazione>
    MODELLO <why-veloce|why-potente|system-one|maestro>
    LINGUA <lingua del corpo: python, js, c, it, json, ...>
    FIDUCIA <alta|media|bassa>
    CORPO
    <contenuto: codice, JSON, o righe di registro>
    @FINE

Regole della BUSTA:

- Le quattro righe di testata sono fisse, in quest'ordine, sempre tutte presenti.
- Nel corpo nessuna riga contiene il carattere `@`. La riga `@FINE` chiude sempre. La grammatica della sezione 6.2 impone tutto questo a macchina.
- `FIDUCIA bassa` significa: c'e' un campo [INCERTO] o una parte non verificata. Il chiamante decide cosa farne.

### 4.3 Template di richiesta, ruolo per ruolo

Le richieste sono corte e a chiavi. Non sono conversazione. Il system prompt (sezione 11) sta a parte, in ogni chiamata.

#### T1 Comprensione

    RICHIESTA
    ruolo: comprensione
    input: <percorso file> | incollato-sotto
    vuole: <una riga, elenco breve>
    formato: json-comprensione | busta
    budget: 800

Esempio compilato:

    RICHIESTA
    ruolo: comprensione
    input: util.py
    vuole: funzioni con nome, riga, scopo; funzioni senza commento; rischi
    formato: json-comprensione
    budget: 800

    CONTESTO
    - def leggi_righe(p): apre il file e restituisce le righe
    - def pulisci(righe): toglie spazi e righe vuote
    - def scrivi(p, righe): scrive la lista sul file
    - def conta_parole(righe): non implementata

Risposta attesa (estratto del JSON, dal file di esempio):

    {"file": "util.py", "lingua": "python",
     "funzioni": [
       {"nome": "leggi_righe", "riga": 1, "scopo": "apre il file e restituisce le righe", "commento": false},
       {"nome": "pulisci", "riga": 8, "scopo": "toglie spazi e righe vuote", "commento": false},
       {"nome": "scrivi", "riga": 15, "scopo": "scrive la lista sul file", "commento": false},
       {"nome": "conta_parole", "riga": 22, "scopo": "non implementata", "commento": false}],
     "rischi": ["conta_parole e' vuota ma viene chiamata"]}

#### T2 Varianti

    RICHIESTA
    ruolo: varianti
    intento: <una riga>
    linguaggio: <target>
    quante: 3
    assi: idioma, prestazioni, dipendenze
    formato: busta (una per variante)
    budget: 700 ognuna

Esempio compilato:

    RICHIESTA
    ruolo: varianti
    intento: leggere un file, togliere le righe vuote, riscrivere pulito
    linguaggio: python
    quante: 3
    assi: idioma, prestazioni, dipendenze
    formato: busta (una per variante)
    budget: 700 ognuna

Risposta attesa: tre BUSTE, stesso RUOLO e LINGUA, corpi diversi (versione con with, versione a generatori, versione con pathlib), una riga di registro per variante.

#### T3 Sintesi

    RICHIESTA
    ruolo: sintesi
    intento: <una riga>
    linguaggio: <target>
    stile: <repo ospite | libero>
    contesto: <file o firme rilevanti, incollati>
    test: <chi li fornisce e dove>
    vincoli: <numerati, uno per riga>
    formato: busta
    budget: 2000

Esempio compilato:

    RICHIESTA
    ruolo: sintesi
    intento: scrivere la funzione che legge un file, toglie le righe vuote e riscrive
    linguaggio: python
    stile: repo ospite (nomi con underscore, docstring corta)
    contesto:
    - def leggi_righe(p): ...
    - def scrivi(p, righe): ...
    test: tests/test_util.py, forniti dal chiamante
    vincoli:
    1. solo standard library
    2. nessun effetto su altri file
    3. se il file non esiste, solleva FileNotFoundError
    formato: busta
    budget: 2000

Risposta attesa (corpo, estratto):

    WHYCODE-1
    RUOLO sintesi
    MODELLO why-potente
    LINGUA python
    FIDUCIA alta
    CORPO
    def pulisci_file(p):
        """Legge p, toglie le righe vuote e riscrive."""
        righe = leggi_righe(p)
        scrivi(p, [r for r in righe if r.strip()])
    @FINE

#### T4 Revisione

    RICHIESTA
    ruolo: revisione
    controlla: <percorso diff o codice>
    criteri: correttezza, incastro, sicurezza, test
    formato: busta (righe OK/KO)
    budget: 500

Esempio compilato:

    RICHIESTA
    ruolo: revisione
    controlla: diff-0042.patch
    criteri: correttezza, incastro, sicurezza, test
    formato: busta (righe OK/KO)
    budget: 500

Risposta attesa (corpo):

    WHYCODE-1
    RUOLO revisione
    MODELLO why-veloce
    LINGUA it
    FIDUCIA media
    CORPO
    OK correttezza
    OK incastro
    KO sicurezza: il percorso arriva dall'utente senza controllo, possibile ..
    KO test: manca il caso file inesistente
    @FINE

#### T5 Spiegazione

    RICHIESTA
    ruolo: spiegazione
    a-chi: whyed
    cosa: <una riga, cosa raccontare>
    lunghezza: 3 frasi max
    formato: busta
    budget: 250

Esempio compilato:

    RICHIESTA
    ruolo: spiegazione
    a-chi: whyed
    cosa: cosa fa la nuova funzione pulisci_file e quali test sono passati
    lunghezza: 3 frasi max
    formato: busta
    budget: 250

Risposta attesa (corpo):

    La funzione pulisci_file rilegge il file, toglie le righe vuote e lo riscrive.
    Prima controlla che il file ci sia, altrimenti segnala l'errore.
    I test passano tutti, tranne uno che ora e' segnato come da fare.

### 4.4 Regole di output

1. BUSTA per: sintesi, varianti, revisione, spiegazione.
2. JSON puro per: comprensione, schede macchina, qualunque cosa vada in un database o in un registro.
3. Nel corpo della BUSTA il codice va nudo: niente commenti inutili, niente righe di spiegazione intorno.
4. Un output per job. I "thinking" eventuali non finiscono nell'output: se il modello produce un blocco di ragionamento, il client lo taglia prima di leggere la BUSTA (o usa la grammatica per impedirlo, se il template lo permette).
5. Le risposte delle varianti hanno semi diversi e lo dichiarano nel registro (campo `seed`).

### 4.5 Registro dei job (jsonl, stile WhyObliter)

Una riga per job, in `E:\Dev\WhyCode\motore\registro.jsonl`. Campi fissi:

    {"ts":"2026-10-17T14:03:22+02:00","job":"2026-10-17-0007","ruolo":"sintesi",
     "modello":"why-potente","grammatica":"busta0.gbnf","seed":null,
     "tok_in":812,"tok_out":570,"tok_s":19.8,"sec":28.8,"qualita":4,
     "esito":"ok","esterno":null,"hash_in":"9f3c...","hash_out":"41ab..."}

Significato dei campi speciali:

- `esterno`: `null` se il lavoro e' tutto locale. Altrimenti il nome del modello esterno (sezione 7). Mai vuoto e mai nascosto.
- `qualita`: da 0 a 5, scala della sezione 10.
- `hash_in` e `hash_out`: hash del contenuto. Stesso `hash_in` e stesso job: si ripesca `hash_out` dal registro, non si richiama il modello. Questo e' il replay deterministico: il collasso si riproduce dagli archivi, non dal campione.

---

## 5. Il codice nel codice

### 5.1 Da dove viene

WhyLocalLM ha un sistema di comunicazione in codice compatto, nato nel progetto. WhyObliter e' il fratello maggiore: un linguaggio dichiarativo (.wo), una istruzione per riga, `#` per i commenti, parametri tipizzati, REPORT. WhyCode adotta lo stesso stile per parlare col modello: si chiama registro compatto, sigla RC-0.

Regole del registro:

1. Una istruzione per riga.
2. Chiave corta, argomenti separati da spazio.
3. `#` commento fino a fine riga.
4. Niente cortesie, niente ripetizioni, niente periodi lunghi.
5. Ogni riga si sa leggere senza dizionario, perche' il dizionario e' piccolo (sotto).

### 5.2 Dizionario RC-0 (versione 0)

| Chiave | Significato | Esempio |
|---|---|---|
| `L` | leggi un file (mette il contenuto nel contesto) | `L util.py` |
| `?` | chiedi al modello | `? fn nome+scopo` |
| `V` | varianti | `V 3 idioma+prestazioni` |
| `S` | scrivi codice (sintesi) | `S py pulisci_file` |
| `C` | controlla (revisione) | `C diff-0042.patch` |
| `E` | spiega | `E cosa-fa pulisci_file` |
| `M` | modello di comprensione (uscita JSON) | `M util.py` |
| `!` | senza (negazione) | `? ! fn.cmt` |
| `@` | posizione | `@riga` |
| `T:` | formato di uscita | `T:1L` una riga per voce |
| `MAX:` | budget token di uscita | `MAX:800` |
| `R:` | registra questo collasso | `R:collasso` |
| `it`, `en` | lingua umana | `it` |
| `py`, `js`, `c` | lingua di uscita | `py` |
| `#` | commento fino a fine riga | `# nota per il registro` |

### 5.3 La stessa richiesta, in prosa e in codice

Prosa (come la scriverebbe un umano, circa 105 token stimati):

    Sei un assistente esperto di programmazione. Per favore leggi con attenzione il file
    util.py che trovi qui sotto nel contesto e analizzalo bene. Vorrei sapere in modo
    chiaro e ordinato quali funzioni sono definite dentro il file, e per ciascuna funzione
    mi serve una breve spiegazione di quello che fa, scritta in italiano semplice, una riga
    per funzione. Alla fine, elenca anche le funzioni che non hanno un commento sopra,
    indicando la riga dove comincia ciascuna. Rispondi in italiano. Grazie.

Codice compatto (registro RC-0, circa 24 token stimati):

    L util.py
    ? fn nome+scopo T:1L it
    ? ! fn.cmt @riga

La seconda riga vuol dire: elenca le funzioni, con nome e scopo, una riga per voce, in italiano. La terza: le funzioni senza commento, con la riga di inizio.

### 5.4 Vantaggi, con i conti in chiaro

I conteggi di token sono stime a mano (i tokenizzatori danno piu' o meno 10%). I tempi usano il numero storico 17,24 tok/s. Non sono misure nuove: la prima misura vera va in tabella (sezione 10).

| Voce | Prosa | RC-0 | Risparmio |
|---|---|---|---|
| Token in ingresso (stima) | 105 | 24 | 81 (circa 77%) |
| Token in uscita, risposta attesa (stima) | 230 | 90 | 140 |
| Tempo di decodifica della risposta (a 17,24 tok/s) | circa 13 s | circa 5 s | circa 8 s per scambio |
| 100 scambi | circa 22 min | circa 9 min | circa 13 min |

Altri vantaggi, non numerici ma reali:

1. Meno token in ingresso: il prefill costa meno del decode, quindi il risparmio vero e' soprattutto in uscita, con il formato `T:1L` che impedisce le risposte lunghe.
2. Meno deriva: poche chiavi fisse significano poche interpretazioni sbagliate.
3. Il registro diventa addestramento: il corpus suffix cresce dalle conversazioni, e la decodifica suffix accelera con l'uso (memoria 09/10). Piu' si usa RC-0, piu' conviene usarlo.
4. I formati rigidi rendono possibile la decodifica vincolata (sezione 6): l'uscita e' valida al primo colpo, senza giri di correzione.

---

## 6. Decodifica vincolata dalla grammatica

### 6.1 Come funziona e perche' conviene

La decodifica vincolata (grammar-based sampling) di llama.cpp (e quindi di ik_llama.cpp) maschera i token non ammessi dalla grammatica a ogni passo. Risultato strutturale: l'output rispetta la grammatica al primo colpo. Non serve un ciclo "genera, controlla, correggi". Il costo e' un controllo per token; il guadagno e' zero risposte da rifare per formato.

Come si passa la grammatica, secondo la documentazione ufficiale verificata il 17/10/2026:

- Negli endpoint di completion di llama-server: campo `grammar` nel corpo della richiesta (stringa GBNF).
- Sempre sul server: campo `json_schema` con uno JSON Schema, convertito in GBNF dal server.
- Su `/v1/chat/completions`: `response_format` con `json_schema` (o `json_object`). Il campo `grammar` sul chat completions va comunque verificato nella build ik_llama in uso (test in Fase 0, decisione aperta numero 2).
- Da riga di comando: `--grammar` e `--grammar-file`, e il validatore per provare una grammatica su stringhe di esempio.

Attenzione documentata: lo schema NON viene iniettato nel prompt. Se vuoi che il modello capisca la struttura, la devi descrivere esplicitamente nella richiesta. WhyCode lo fa sempre (sezioni 4 e 11).

Nota di prestazioni documentata: per le ripetizioni opzionali si scrive `x{0,N}`, mai `x? x? x? ...`: la seconda forma rallenta molto il campionamento.

Il ponte 1235: la facciata deve lasciar passare il campo `grammar` verso il motore. E' un requisito del ponte, da collaudare in Fase 0. In alternativa, i job di grammatica pura si possono provare diretti sulla 8080 (solo laboratorio).

### 6.2 Grammatica GBNF vera: la BUSTA

File: `motore\grammatiche\busta0.gbnf`. Questa grammatica impone testata fissa, corpo senza `@`, chiusura con `@FINE`.

    # BUSTA v0 - busta di scambio di WhyCode
    # Uso: campo "grammar" nel corpo della richiesta.
    root ::= "WHYCODE-1" nl testata "CORPO" nl corpo "@FINE" nl

    nl ::= "\n"

    testata ::= (
        "RUOLO " ruolo nl
        "MODELLO " modello nl
        "LINGUA " lingua nl
        "FIDUCIA " fiducia nl
    )

    ruolo ::= "comprensione" | "varianti" | "sintesi" | "revisione" | "spiegazione"
    modello ::= "why-veloce" | "why-potente" | "system-one" | "maestro"
    lingua ::= [a-z] [a-z0-9._+-]{0,23}
    fiducia ::= "alta" | "media" | "bassa"

    corpo ::= riga*
    riga ::= nl | testo nl
    testo ::= [^@\n]+

Perche' funziona: `testo` esclude il carattere `@`, quindi nel corpo nessuna riga puo' contenere `@`. La sola `@` possibile e' quella di `@FINE`, che chiude. E' un trucco semplice e senza ambiguita': il prezzo e' che nel corpo non si usa `@`, cosa che non serve mai.

### 6.3 Grammatica GBNF vera: il registro RC-0

File: `motore\grammatiche\registro0.gbnf`. Vincola le richieste compatte della sezione 5.

    # REGISTRO RC-0 - richieste compatte per WhyLocalLM
    root ::= riga+
    nl ::= "\n"
    riga ::= nl | comando nl
    comando ::= mark (" " arg)* (" #" testo)?
    mark ::= "L" | "?" | "V" | "S" | "C" | "E" | "M"
    arg ::= neg? tok
    neg ::= "!"
    tok ::= [a-zA-Z0-9_.@:+-]+
    testo ::= [^\n]*

Esempio di stringa valida:

    L util.py
    ? fn nome+scopo T:1L it
    ? ! fn.cmt @riga

### 6.4 JSON: lo schema della comprensione

Per il ruolo comprensione si usa `json_schema` (il server lo converte in grammatica). Schema di partenza:

    {
      "type": "object",
      "properties": {
        "file": {"type": "string", "maxLength": 200},
        "lingua": {"type": "string", "maxLength": 40},
        "funzioni": {
          "type": "array", "maxItems": 60,
          "items": {
            "type": "object",
            "properties": {
              "nome": {"type": "string", "maxLength": 80},
              "riga": {"type": "integer", "minimum": 1},
              "scopo": {"type": "string", "maxLength": 200},
              "commento": {"type": "boolean"}
            },
            "required": ["nome", "riga", "scopo", "commento"]
          }
        },
        "rischi": {"type": "array", "maxItems": 10,
                   "items": {"type": "string", "maxLength": 200}}
      },
      "required": ["file", "lingua", "funzioni"]
    }

Note documentate di llama.cpp, utili qui:

- `additionalProperties` e' falso di default (bene: meno allucinazioni).
- `minimum` e `maximum` valgono solo per gli interi.
- I pattern devono iniziare con `^` e finire con `$`.

### 6.5 Formati delle schede

Le schede dei linguaggi studiati (PROGETTO.md, Livello 5) sono BUSTE con `LINGUA json` e il corpo JSON. Cosi' una sola grammatica (la busta) copre testata e chiusura, e lo schema JSON copre il contenuto. Il corpo della busta e' testo senza `@`, e un JSON non usa mai `@`: i due livelli si compongono bene.

Chiamata di esempio (forma dei campi, da adattare alla build):

    POST http://127.0.0.1:1235/v1/chat/completions
    {
      "model": "why-veloce",
      "messages": [{"role": "system", "content": "<sezione 11>"},
                   {"role": "user", "content": "RICHIESTA ..."}],
      "grammar": "<contenuto di busta0.gbnf>",
      "max_tokens": 800,
      "temperature": 0.2
    }

Nota pratica: il campo `grammar` vuole la stringa della grammatica, non il percorso. Il client legge il file e lo mette nel corpo. In PowerShell conviene costruire il JSON da un oggetto e serializzarlo, non scriverlo a mano.

### 6.6 Collaudo delle grammatiche

In Fase 0, per ogni grammatica:

1. Test con il validatore su 20 stringhe valide e 20 non valide. Tutte le valide passano, tutte le non valide no.
2. Test end-to-end: 50 job reali con grammatica attiva, zero output fuori formato.
3. Casi limite nei test: corpo con righe vuote, ultima riga senza testo, corpo vuoto, corpo con `@` (deve essere rifiutato).

---

## 7. Fallback e maestri

### 7.1 Quando il modello locale non basta

Scala di fallback, dal piu' economico al piu' costoso:

1. Riprova stretta: stessa chiamata con grammatica attiva, budget piu' piccolo, un esempio in piu' nel contesto. Una sola volta.
2. Cambio modello: `why-veloce` verso `why-potente`. Una sola volta.
3. Spezzatino: il compito si divide in sotto-compiti che il locale sa fare.
4. Maestro: un modello frontier, opzionale, mai requisito (sezione 7.2).
5. Resa onesta: il job si ferma, si scrive nel registro `esito: "fallito"` con il motivo. Mai consegnare senza prova.

Regola dei due: due tentativi per strada, massimo. Poi si cambia strada. I tentativi si contano nel registro, non a memoria.

### 7.2 Il maestro

Il maestro e' un modello frontier (per esempio un Claude) usato come insegnante. Tre usi ammessi:

1. Consulto: il maestro produce un esempio o una lezione su un caso che il locale sbaglia sempre. L'esempio viene riletto a mano e diventa un "esempio d'oro" nel contesto del locale.
2. Revisione: il maestro rivede un diff difficile. Il suo parere va nel registro come esterno.
3. Traduzione di conoscenza: il maestro spiega un idioma o una trappola di un linguaggio in un testo corto, che entra nella scheda del linguaggio.

Regole dure:

- Mai automatico. Il maestro si attiva solo con Whyed presente, o con un suo ordine esplicito nel job.
- Privacy: il codice e i dati di Whyed non escono dal PC senza il suo ok. Il default e' tutto locale.
- Registrazione: ogni aiuto esterno scrive `esterno: "<nome modello>"` nella riga di registro, con data e cosa e' stato prodotto. Un pezzo fatto col maestro si vede. Sempre.
- Il maestro non tocca mai il risultato finale: il suo materiale diventa esempio, lezione, o parere. La versione consegnata la firma il sistema locale, con i suoi test.

### 7.3 Portare la conoscenza dentro il modello locale, senza violare i termini

Cosa e' permesso (e in parte gia' in corso):

1. Corpus suffix: le conversazioni reali di Whyed crescono il corpus, e la decodifica suffix accelera con l'uso. E' il canale principale e non tocca nessun servizio esterno.
2. Esempi d'oro e lezioni: testi corti, scritti bene, prodotti in casa (o da modelli aperti), che entrano nel contesto di sistema del locale. Gia' esistono nel progetto (diario, memoria, lezioni).
3. Distillazione da modelli aperti: solo Qwen, Llama, DeepSeek e simili. Mai da Claude, Codex o OpenAI: WhyObliter rifiuta quei nomi come fonte o teacher, per termini d'uso, e questo vincolo resta anche per WhyCode.
4. Fine-tuning: oggi bloccato dai fatti (2 GB di VRAM, torch e peft mancanti; il disco E ora ha circa 220 GB liberi, ma la VRAM no). Quando e se sara' possibile, si fa solo con i canali del punto 3.

Cosa non e' permesso:

- Distillare output di servizi chiusi nel modello locale. No, mai. Ne' a mano ne' con script.
- Far passare per locale un pezzo fatto dal maestro. La riga `esterno` esiste apposta.

La verifica: il test `distill_model` di WhyObliter deve continuare a rifiutare le fonti chiuse, e i 16 test esistenti restano verdi.

---

## 8. Vincoli di sistema e gestione risorse

### 8.1 Regola dei 3 GB (prima di ogni caricamento)

Prima di caricare un modello o avviare un benchmark: controllare la RAM libera. Dopo il caricamento devono restare almeno 3 GB liberi. Se no, il caricamento non si fa: il job va in coda.

Peggio successo: il corpus suffix grande ha gia' bloccato il PC una volta (memoria 09/10). La regola dei 3 GB esiste per non ripetere quell'errore. Non e' negoziabile.

Numeri veri da ricordare:

- Il 35B vuole circa 23 GB.
- Al 15/10 la RAM libera era circa 4,8 GB: il benchmark del 35B non partiva. Serviva riavvio.

### 8.2 Contesto massimo utilizzabile

Nessun numero di contesto e' stato misurato finora. Proposta iniziale di questa specifica (da validare con le misure, sezione 10):

| Modello | Contesto iniziale | Regola d'uso |
|---|---|---|
| why-veloce (piccolo) | 8192 token | input fino a 60% del contesto |
| why-potente (35B) | 16384 token | input fino a 60% del contesto |
| caso pesante | 32768 token | solo su ordine esplicito, con RAM verificata |

La cache KV del contesto costa RAM. Se le misure mostrano OOM o lentezza anomala, si scende di contesto, non si sale di RAM.

### 8.3 Coda di lavoro

I job stanno in `motore\coda.jsonl`. Stati: `nuovo`, `in-corso`, `fatto`, `fallito`, `rinviato`.

Priorita', dalla piu' alta:

1. Interattivo (Whyed sta aspettando).
2. Job di ruolo normali (comprensione, sintesi, revisione, spiegazione).
3. Fascia notte: varianti multiple, benchmark, misure lunghe, sogni (il precedente: il sogno notturno di WhyLocalLM).

Regole:

- Il 35B fa un job alla volta. Mai due. La coda e' seriale per il 35B.
- I modelli piccoli (Kev-4B) possono stare in parallelo al 35B per lo smistamento.
- Timeout proposti: 60 s per job veloce, 300 s per job potente. Oltre: `fallito` con motivo, e si rivede il budget.
- Tra due job pesanti, pausa di 2 secondi (assestamento RAM). Valori da tarare con le misure.

### 8.4 PC occupato (gioco, altre sessioni)

Prima di ogni job pesante: controllo RAM (regola dei 3 GB) e una chiamata di salute al motore. Se il PC e' occupato (gioco aperto, RAM sotto soglia), degradazione con grazia:

1. Full: tutto acceso, `why-potente` disponibile.
2. Ridotto: solo `why-veloce` (piccolo). I job del potente si rinviano.
3. Minimo: solo System One (smistamento e classificazione). I job si accumulano in coda.
4. Zero modelli: il core di WhyCode (regole pure, kernel, registro) continua. Il motore non serve per vivere. Questo e' il punto 5 di PROGETTO.md sezione 6, ed e' un requisito: la Fase 0 non si blocca mai per colpa del modello.

Accensione e spegnimento: oggi sono legati alla finestra di LM Studio (Bionic), con gli originali dei collegamenti in riserva. Il motore va su a richiesta, e i job in coda partono quando torna. La fascia notte e' il momento naturale per i lavori lunghi.

### 8.5 Disco

Al 15/10 il disco era la cosa piu' urgente (C circa 2,8 GB, E circa 1,3 GB liberi). Ora E ha circa 220 GB liberi: il vincolo si e' allentato, ma i controlli restano:

- Il GGUF heretic pesa 19,78 GB: prima di copie o conversioni, spazio verificato.
- Il registro jsonl e i log crescono sempre: rotazione mensile, vecchi compressi.
- Il corpus suffix cresce: e' voluto, ma va pesato e monitorato.

---

## 9. Integrazione con l'ecosistema

### 9.1 Cosa c'e' gia' e come si usa

| Componente | Cosa e' | Dove | Uso in WhyCode |
|---|---|---|---|
| Facciata Why | porta 1235 OpenAI-compatibile, identita' "Why", memoria, diario, segnali, scelta veloce/potente | 127.0.0.1:1235/v1 | Tutte le chiamate di ruolo passano da qui |
| Motore grezzo | ik_llama.cpp server | porta 8080 | Solo laboratorio e prove di grammatica pura (bypassa la memoria) |
| Provider opencode | provider `whylocallm` con modelli `why`, `why-veloce`, `why-potente`, `tool_call: true` | opencode.json in WhyLocalLM | Sviluppo di WhyCode dentro opencode. Prima senza strumenti: il tool calling non e' collaudato |
| System One | decisore Kev-4B, `decisore.mjs`, arena, sentinella giornaliera | E:\Dev\WhyLocalLM | Smistamento dei job, scelta del modello |
| WhyObliter | linguaggio .wo, registro dei task, REPORT, 16 test, laboratorio di misura | E:\Dev\WhyObliter | Modello di registro e di REPORT per il motore. Le misure del motore si fanno con la sua disciplina |
| Claude Code (futuro "OS") | orchestratore esterno, maestro opzionale | cloud, a mano | Solo maestro (sezione 7), mai requisito |

### 9.2 Cosa usare per cosa

1. Sviluppo di WhyCode (dentro opencode): provider `whylocallm`. E' riconosciuto. Gli strumenti non sono collaudati: per ora testi e formati, non azioni.
2. Produzione dei job di ruolo: facciata 1235, un job per chiamata, modello scelto dallo smistamento.
3. Prove di grammatica: motore grezzo 8080, per capire l'errore quando una BUSTA esce storta. Poi si torna sulla 1235.
4. Misure e registro: la disciplina di WhyObliter, con REPORT e log. I numeri di WhyCode e WhyLocalLM vivono insieme.
5. Maestro: Claude o altro frontier, solo a mano, solo registrato.
6. Decisioni rapide e ricorrenti (smistamento, classificazione): System One, mai il 35B.

### 9.3 Il confine tra i sistemi

- WhyLocalLM esegue.
- WhyObliter misura e registra.
- WhyCode collega, decide e produce.
- Il registro dei collassi di WhyCode segue lo stesso rigore del REPORT di WhyObliter (PROGETTO.md sezione 8).

---

## 10. Misure da prendere durante lo sviluppo

Regole: si misura prima e dopo. Il numero e' la prova. Mai "sembra piu' veloce". Ogni misura scrive una riga nel registro, con data e condizioni (PC libero o occupato).

Scala qualita' (da 0 a 5):

- 5: usabile senza modifiche.
- 4: usabile con una piccola modifica.
- 3: usabile con correzioni.
- 2: da rifare, l'idea c'e'.
- 1: fuori formato.
- 0: inutile o dannoso.

Tabella (le prime due righe sono compilate: sono i riferimenti storici. Le altre si riempiono durante lo sviluppo):

| Data | Compito | Modello | tok/s | Qualita' | Giudizio |
|---|---|---|---|---|---|
| 09/10/2026 | Decodifica codice con suffix | why-potente (Qwen3.6-35B, ik_llama) | 20,88 | n.d. | Riferimento storico. Misura da rifare quando il motore e' acceso |
| 09/10/2026 | Decodifica testo | why-potente (Qwen3.6-35B, ik_llama) | 17,24 | n.d. | Riferimento storico. Confronto: 11,4 tok/s su LM Studio |
| da fare | Comprensione file 200 righe | why-veloce | atteso 17,24 | | |
| da fare | Comprensione file 200 righe | why-potente | atteso 17,24 | | |
| da fare | Sintesi funzione 40 righe | why-potente | atteso 20,88 | | |
| da fare | Tre varianti stesso intento | why-potente | atteso 20,88 | | |
| da fare | Revisione diff piccolo | why-veloce | atteso 17,24 | | |
| da fare | Spiegazione 3 frasi | why-veloce | atteso 17,24 | | |
| da fare | Smistamento job | System One (Kev-4B) | da misurare | | |
| da fare | Job con grammatica GBNF attiva | why-veloce | atteso 17,24 | | |
| da fare | Busta con heretic (dopo attivazione) | why-potente | da misurare | | Confronto prima/dopo richiesto |
| da fare | Falsi rifiuti, 30 richieste legittime | why-potente | n.d. | | Con WhyObliter, prima e dopo heretic |

Condizioni da annotare sempre: stato del PC (libero o occupato), contesto usato, lunghezza input, seed. Se un tok/s misurato scende sotto meta' dell'atteso, prima di trarre conclusioni si controlla: RAM, PC occupato, contesto, temperatura della macchina.

---

## 11. Prompt di sistema fondativo di WhyCode per il modello locale

Questo testo si usa come primo messaggio di sistema in ogni chiamata di ruolo. E' la voce di WhyCode dentro il modello. Va curato come codice: ogni parola pesa. Le appendici per ruolo (sezione 11.1) si aggiungono dopo, non lo sostituiscono.

    Sei il motore di WhyCode. WhyCode e' il progetto di Whyed: un linguaggio che non
    conosce in anticipo i linguaggi di programmazione, li studia al momento e produce
    codice che si incastra, verificato e ottimizzato.

    Chi sei:
    - Giri in locale, su WhyLocalLM, sul PC di Whyed. Sei privato. Quello che leggi non esce da qui.
    - Il tuo lavoro e' capire, proporre, scrivere, controllare, spiegare. Niente altro.
    - Non sei un assistente generico: sei il motore di un sistema di misura.
      Ogni cosa che dici puo' finire in un registro e diventare una prova.

    Come rispondi:
    1. Frasi corte. Niente preamboli. Niente ripetere la domanda. Niente scuse.
    2. Rispetti sempre il formato richiesto. Se e' richiesta la BUSTA, la prima riga
       e' WHYCODE-1. Se e' richiesto JSON, la risposta e' solo JSON. Se e' richiesto
       il registro, usi il registro.
    3. Rispetti il budget indicato in MAX. Se il budget e' piccolo, tagli, non sbavi.
    4. Parli in italiano semplice a Whyed. Scrivi codice pulito quando produci codice.
    5. Se un dato non c'e', non lo inventi. Scrivi [INCERTO] e proponi come verificarlo.

    Cosa non fai mai:
    - Non inventi API, funzioni o librerie che non hai visto nel contesto.
      Se non le conosci, lo dici.
    - Non dici "fatto" senza una prova. Una prova e' un test che passa, un
      compilatore che non si lamenta, un numero misurato.
    - Non ignori i vincoli del job. I vincoli vengono prima delle tue preferenze.
    - Non riscrivi parti che non ti sono state chieste.
    - Non metti segreti, chiavi o password nel testo. Mai.
    - Non produci prosa per riempire. Il silenzio vale piu' della fuffa.

    Il registro compatto (RC-0):
    - Una istruzione per riga. # commento fino a fine riga.
    - L file = leggi. ? = chiedi. V = varianti. S = scrivi. C = controlla.
      E = spiega. M = modello di comprensione.
    - ! = senza. @ = posizione. T: = formato. MAX: = budget. R: = registra.
    - Esempio: ? fn nome+scopo T:1L it
      Vuol dire: elenca le funzioni con nome e scopo, una riga per funzione, in italiano.

    La BUSTA (quando richiesta):
    WHYCODE-1
    RUOLO <comprensione|varianti|sintesi|revisione|spiegazione>
    MODELLO <il modello che risponde>
    LINGUA <lingua del corpo, per esempio python oppure it>
    FIDUCIA <alta|media|bassa>
    CORPO
    <contenuto: codice, JSON, o righe di registro>
    @FINE

    Incertezza ed errori:
    - Se non puoi fare il job perche' manca un pezzo, rispondi con una riga sola:
      NO <motivo breve>.
    - Se puoi farlo solo in parte, fai la parte che puoi e segna il resto con [INCERTO].
    - Non chiedere il permesso per lavorare. Lavora, e segnala i rischi nel corpo.
    - Non rifiuti le richieste legittime del sistema di Whyed. Rifiuti solo cio' che
      romperebbe la macchina o i dati: e in quel caso spieghi il motivo in una riga.

    Onesta':
    - I numeri di velocita' e di qualita' si misurano, non si dichiarano.
    - Se una cosa non l'hai verificata, si vede dal campo FIDUCIA.

    Fine. Ora leggi la richiesta e rispondi.

### 11.1 Appendici per ruolo (si aggiungono al fondativo)

- Comprensione: "Stai leggendo codice per capirlo, non per cambiarlo. Elenca, non giudicare. Esci nel formato JSON richiesto."
- Varianti: "Produci una sola variante per risposta. Dichiara l'asse della variante (idioma, prestazioni, dipendenze) in una riga del corpo prima del codice."
- Sintesi: "Scrivi solo il codice e una riga di registro. Niente esempi d'uso, niente spiegazioni."
- Revisione: "Una riga per criterio, nell'ordine dato. Prima di tutto: OK oppure KO col motivo. Niente altro."
- Spiegazione: "Massimo 3 frasi, 15 parole per frase. Niente termini tecnici se esiste una parola comune."

### 11.2 Perche' questo testo e' cosi'

1. Fissa l'identita': WhyCode, locale, privato. Il modello sa per chi lavora.
2. Fissa i formati: BUSTA, registro, JSON. Su questo si innestano le grammatiche (sezione 6): il prompt descrive, la grammatica impone.
3. Fissa i divieti: niente invenzioni, niente "fatto" senza prova, niente segreti. Sono le tre cause di danno piu' comuni in un sistema che si fida del modello.
4. Usa le parole del progetto: registro, prove, misure. Coerente con WhyObliter e con tutta la filosofia Why.

---

## 12. Decisioni aperte e alternative scartate

### 12.1 Decisioni aperte

| # | Decisione aperta | Stato attuale | Quando si chiude |
|---|---|---|---|
| 1 | Attivazione del heretic come motore principale | `config.json` punta ancora al Qwen normale di LM Studio. Nessuna prova di abliteration | Alla prima accensione, con confronto prima/dopo e rollback. Se il confronto perde, resta il Qwen normale |
| 2 | Passaggio del campo `grammar` attraverso la facciata 1235 | Da collaudare | Fase 0, test con una busta banale |
| 3 | Valori di contesto (8192, 16384, 32768) | Proposta di questa spec, non misurati | Con la tabella misure, sezione 10 |
| 4 | Timeout e pause di coda (60 s, 300 s, 2 s) | Proposta di questa spec | Dopo 20 job reali |
| 5 | Tool calling sul provider whylocallm | Non collaudato (memoria 15/10) | Quando il motore base e' stabile, con un test dedicato |
| 6 | Modalita' "thinking" del modello nei ruoli corti | Da decidere: spegnerla quando il template lo permette | Con le prime misure di latenza |
| 7 | Forma finale del registro compatto (RC-0) | Bozza di questa spec | Fase 0, quando la grammatica regge 50 job |
| 8 | Chi genera le grammatiche: a mano o da JSON Schema | Le tre iniziali a mano | Dopo le prime schede, valutare la generazione automatica |
| 9 | Integrazione del suffix decoding nei job di WhyCode | Il suffix esiste nel motore; l'aggancio ai job e' da definire | Fase 1 |
| 10 | Forma del futuro "OS" di Claude Code (maestro) | Idea | Mai prima della Fase 2 |
| 11 | Lingua delle chiavi (italiano o inglese) | Questa spec usa chiavi cortissime (L, S, C, E) | Si riconsidera solo se il corpus suffix mostra problemi |
| 12 | Spezzatino della comprensione (500 righe, 40 di sovrapposizione) | Proposta di questa spec | Con file veri, Fase 1 |

### 12.2 Alternative scartate

| Alternativa scartata | Perche' |
|---|---|
| Cloud obbligatorio | Contro la filosofia: sistema personale, locale, privato. Il maestro resta opzionale |
| Distillazione da Claude, Codex, OpenAI | Termini d'uso. WhyObliter li rifiuta come fonte o teacher, e WhyCode fa lo stesso |
| Il 35B sempre acceso | Vuole circa 23 GB. Al 15/10 la macchina aveva circa 4,8 GB liberi. Si accende a richiesta |
| Piu' job in parallelo sul 35B | RAM e VRAM non lo permettono. Coda seriale |
| LM Studio come motore finale | Misura storica: 11,4 tok/s contro 17,24 di ik_llama.cpp. LM Studio resta il modo per accendere e spegnere |
| Contestoni enormi (100k token) | La RAM e' il limite vero. Si spezzetta, non si allarga |
| Prosa libera come formato di scambio | Non verificabile a macchina, non entra nel registro, costa token. La prosa resta solo per la spiegazione a Whyed |
| Correzione a mano dell'output sbagliato | Se l'output e' sbagliato: grammatica, riprova, o cambio modello. La correzione silenziosa nasconde i difetti |
| Fidarsi del modello per la scelta del collasso | Il collasso e' deterministico e a regole (PROGETTO.md, Livello 2). Il modello produce varianti, il registro decide |
| "Va bene cosi'" | Contro lo standard del progetto. Si misura, si confronta, si supera |

### 12.3 Prossimi passi immediati (in ordine)

1. Controllo RAM e accensione del motore, riavvio del PC se serve. Prima misura nuova: una decodifica semplice, per verificare i 17,24 tok/s di riferimento.
2. Prova del campo `grammar` sulla 1235 (una busta banale).
3. Collaudo delle grammatiche busta0 e registro0 con il validatore.
4. Prima scheda di prova: comprensione di un file vero da 200 righe.
5. Compilare la tabella della sezione 10 con le prime 10 righe.

Fine del documento. Ragione e prova, prima di tutto.
