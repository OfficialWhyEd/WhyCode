# FORMATI: i formati su disco di WhyCode

Questo documento e' la descrizione umana dei formati che WhyCode legge e scrive.
La verita' eseguibile sono gli schemi zod in `src\condivisi\schemi.ts`: se il codice
cambia, questo documento cambia insieme. Riferimenti: PIANO-IMPLEMENTAZIONE.md
(appendice A), SPEC-02 (sezione 6), SPEC-03 (sezione 5), SPEC-06 (sezione 2).

## 0. Regole comuni

- Date e ore: ISO 8601 con fuso locale, esempio `2026-10-17T09:30:00+02:00`.
  Mai forme ambigue tipo `17/10/26`.
- Scrittura dei JSON: atomica (file `.tmp-<pid>` nella stessa cartella, poi rinomina).
  Se il file esisteva, prima si crea un backup `<file>.bak-<data>`, una volta sola per giorno.
- I file `.jsonl` sono append-only: si aggiunge una riga in coda, mai riscrittura.
  Una riga = un JSON compatto.
- Un file che non rispetta lo schema non passa: errore chiaro, mai lettura "a fiducia".
- Tutti i percorsi sono relativi alla radice del progetto.

```
kb\
  indice.json                              elenco dei linguaggi studiati
  linguaggi\<nome>\
    scheda.json                            la Scheda Linguaggio
    scheda.storico.jsonl                   una riga per ogni salvataggio
    comprensione\v<N>.json                 Modelli di Comprensione conosciuti
registro\
  collassi\collassi.jsonl                  una riga per ogni collasso
  prove\prove.jsonl                        una riga per ogni prova eseguita
  comprensione.jsonl                       eventi di comprensione (SPEC-02, sezione 8.2)
```

## 1. Scheda Linguaggio

File: `kb\linguaggi\<nome>\scheda.json`.
Cosa racconta: tutto quello che WhyCode ha imparato di un linguaggio (SPEC-06).

| Campo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| nome | testo minuscolo | si | nome del linguaggio; e' anche il nome della cartella |
| versione_studiata | testo | si | la versione studiata, esempio `3.13` |
| famiglia | testo | no | famiglia di appartenenza, esempio `serpenti` |
| grammatica | oggetto | si | come il kernel riconosce il linguaggio (vedi sotto) |
| uast_version | intero >= 1 | si | versione dell'albero UAST usato |
| idiomi | lista di testo | si | modi tipici di scrivere quel linguaggio |
| trappole | lista di testo | si | cose che sorprendono chi viene da fuori |
| stile_default | oggetto | si | indentazione, stile dei nomi, virgolette |
| benchmark | lista di voci | si | prove fatte, con esito e durata |
| confidenza | numero da 0 a 1 | no | quanto ci fidiamo di questa scheda |
| stato | `in-prova` oppure `stabile` | si | se la scheda e' ancora in rodaggio |
| studiata_il | data `AAAA-MM-GG` | si | primo studio |
| aggiornata | data `AAAA-MM-GG` | si | ultimo aggiornamento |
| note | testo | no | righe libere |

Oggetto `grammatica`:

| Campo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| tipo | `tree-sitter` oppure `inferita` oppure `regole` | si | come e' stato capito il linguaggio |
| pacchetto | testo | no | nome del pacchetto della grammatica |
| wasm | testo | no | percorso del file `.wasm`, dentro `vendor\` |
| bnf | testo | no | grammatica in forma testuale, quando `tipo` e' `inferita` |

Oggetto `stile_default`:

| Campo | Tipo | Obbligatorio |
|---|---|---|
| indent | intero >= 0 | si |
| nomi | testo, esempio `snake_case` | si |
| virgolette | testo, esempio `doppie` | si |

Voce `benchmark`:

| Campo | Tipo | Obbligatorio |
|---|---|---|
| numero | intero >= 1 | si |
| cosa | testo | si |
| esito | `ok` oppure `fallito` oppure `saltato` | si |
| durata_ms | intero >= 0 | si |

Esempio completo:

```json
{
  "nome": "zeta",
  "versione_studiata": "0.4",
  "famiglia": "mini-linguaggi",
  "grammatica": { "tipo": "inferita", "bnf": "espressioni: 12 regole" },
  "uast_version": 1,
  "idiomi": ["blocchi con graffe", "stampa a riga"],
  "trappole": ["niente punto e virgola"],
  "stile_default": { "indent": 2, "nomi": "snake_case", "virgolette": "doppie" },
  "benchmark": [
    { "numero": 1, "cosa": "parse di 10 esempi", "esito": "ok", "durata_ms": 42 }
  ],
  "confidenza": 0.6,
  "stato": "in-prova",
  "studiata_il": "2026-10-20",
  "aggiornata": "2026-10-20",
  "note": "primo studio, da rivedere con altri esempi"
}
```

Storico: `scheda.storico.jsonl`, una riga per salvataggio:

```json
{"ora":"2026-10-20T10:00:00+02:00","azione":"salvata","versione":"0.4"}
```

## 2. Modello di Comprensione

File: `kb\linguaggi\<nome>\comprensione\v<N>.json`.
E' l'output del Livello 1: cosa WhyCode ha capito di un pezzo di codice o di un intento
(SPEC-02, sezione 6). La copia canonica per hash vive in `magazzino\mc\<mc_hash>.json`
(SPEC-03), dove `mc_hash` e' lo SHA-256 della forma canonica (chiavi ordinate, niente spazi).

| Campo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| linguaggio | testo | si | di quale linguaggio (o intento) si parla |
| versione | intero >= 1 | si | versione progressiva della comprensione |
| fonte_hash | testo | si | SHA-256 della sorgente capita |
| intenti | lista di intenti | si | cosa fa il codice, in frasi brevi |
| usi | lista di usi | si | come si usa: input e output |
| flusso | lista di testo | si | i passi principali, in ordine |
| effetti | lista di testo | si | cosa tocca il mondo esterno |
| incertezze | lista di testo | si | cosa NON e' stato capito, dichiarato |
| uast | oggetto | si | quanti nodi e qual e' la radice |

Intento compreso: `id` (testo), `descrizione` (testo), `esempi` (lista di testo).
Uso compreso: `nome` (testo), `input` (lista di testo), `output` (testo).

Esempio:

```json
{
  "linguaggio": "zeta",
  "versione": 1,
  "fonte_hash": "sha256:cd34...",
  "intenti": [{ "id": "I1", "descrizione": "leggi un numero e stampa il doppio", "esempi": ["2 -> 4", "0 -> 0"] }],
  "usi": [{ "nome": "principale", "input": ["numero"], "output": "numero" }],
  "flusso": ["legge", "calcola doppio", "stampa"],
  "effetti": ["stampa"],
  "incertezze": [],
  "uast": { "nodi": 12, "radice": "blocco" }
}
```

Altri tre esempi reali (decisi in F0, come da PIANO, decisione 3): Python, JavaScript
e una frase di intento in linguaggio naturale (livello 1).

```json
{
  "linguaggio": "python",
  "versione": 1,
  "fonte_hash": "sha256:aa11...",
  "intenti": [{ "id": "I1", "descrizione": "sommare i numeri di una lista e restituire il totale", "esempi": ["[] -> 0", "[1, 2] -> 3"] }],
  "usi": [{ "nome": "somma", "input": ["lista di numero"], "output": "numero" }],
  "flusso": ["parte da zero", "somma ogni elemento", "ritorna il totale"],
  "effetti": [],
  "incertezze": [],
  "uast": { "nodi": 21, "radice": "funzione" }
}
```

```json
{
  "linguaggio": "javascript",
  "versione": 1,
  "fonte_hash": "sha256:bb22...",
  "intenti": [{ "id": "I1", "descrizione": "mostrare un saluto nella pagina", "esempi": ["Maria -> Ciao Maria"] }],
  "usi": [{ "nome": "saluta", "input": ["testo"], "output": "testo" }],
  "flusso": ["prende il nome", "compone il saluto", "lo scrive nella pagina"],
  "effetti": ["scrittura nella pagina"],
  "incertezze": [],
  "uast": { "nodi": 9, "radice": "funzione" }
}
```

```json
{
  "linguaggio": "intento-umano",
  "versione": 1,
  "fonte_hash": "sha256:cc33...",
  "intenti": [{ "id": "I1", "descrizione": "leggere un file di testo, togliere le righe vuote, salvare il risultato", "esempi": [] }],
  "usi": [{ "nome": "pulisci_file", "input": ["percorso di un file di testo"], "output": "file ripulito" }],
  "flusso": ["legge il file", "toglie le righe vuote", "salva"],
  "effetti": ["lettura file", "scrittura file"],
  "incertezze": ["non e' detto se va sovrascritto il file originale o crearne uno nuovo"],
  "uast": { "nodi": 0, "radice": "intento" }
}
```

## 3. Riga di registro collasso

File: `registro\collassi\collassi.jsonl` (SPEC-03, sezione 5). Append-only, immutabile,
una riga per ogni scelta fatta dal collasso. Da F1 in poi la riga porta anche la catena
di hash anti-manomissione (SPEC-08); in F0 vale lo schema qui sotto.

| Campo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| id | testo | si | identificativo della riga, esempio `CL-20261017-0001` |
| ora | ISO 8601 | si | quando e' avvenuto il collasso |
| tipo | `collasso` | si | fisso: distingue questo registro da altri |
| intento_hash | testo | si | hash del Modello di Comprensione di partenza |
| lingua_uscita | testo | si | il linguaggio bersaglio |
| vincoli | mappa testo a testo | si | i vincoli attivi al momento della scelta |
| varianti | lista di testo | si | le varianti in gara |
| scelta | testo | si | quale variante ha vinto |
| motivo | testo | si | perche' ha vinto, con numeri quando ci sono |
| versione_regole | testo | si | versione delle regole di collasso |
| esito_verifica | testo | si | com'e' andata la verifica della scelta |
| durata_ms | intero >= 0 | si | quanto e' durato il collasso |

Esempio:

```json
{"id":"CL-20261017-0001","ora":"2026-10-17T15:04:05+02:00","tipo":"collasso","intento_hash":"sha256:ab12...","lingua_uscita":"python","vincoli":{"stile":"serpente","test":"forniti"},"varianti":["V1","V2","V3"],"scelta":"V2","motivo":"V1 fallisce 1 test; V3 stile non conforme; V2 corretta e conforme","versione_regole":"0.1.0","esito_verifica":"ok","durata_ms":4213}
```

## 4. Riga di registro prove

File: `registro\prove\prove.jsonl`. Append-only, una riga per ogni prova eseguita
(build, test, comandi esterni). Il comando `whycode report test` ne aggiunge una a fine corsa.

| Campo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| id | testo | si | identificativo della prova, esempio `PR-20261017-0003` |
| ora | ISO 8601 | si | quando e' stata fatta |
| tipo | `prova` | si | fisso |
| cosa | testo | si | cosa si e' provato |
| comando | testo | si | il comando eseguito, come si copierebbe a mano |
| esito | `ok` oppure `fallito` oppure `saltato` | si | com'e' andata |
| durata_ms | intero >= 0 | si | durata |

Esempio:

```json
{"id":"PR-20261017-0003","ora":"2026-10-17T15:06:10+02:00","tipo":"prova","cosa":"tutti i test","comando":"node --test build/tests/**/*.test.js","esito":"ok","durata_ms":812}
```

## 5. Etichette UAST (proposta di F0, si raffina in F1)

Il kernel non nomina mai linguaggi. UAST e' l'albero universale: ogni costrutto capito
riceve una di queste 15 etichette. Gli attributi specifici del linguaggio si conservano
accanto al nodo, mai si buttano.

| Etichetta | Definizione in una riga | Esempio 1 | Esempio 2 |
|---|---|---|---|
| funzione | un pezzo di codice con un nome che si puo' richiamare | `def somma(a, b):` | `function somma(a, b) {` |
| chiamata | l'uso di una funzione o di un effetto | `somma(1, 2)` | `leggi("file.txt")` |
| assegnazione | dare un valore nuovo a un nome che esiste gia' | `x = x + 1` | `totale = 0` |
| dichiarazione | far nascere un nome nuovo | `let x = 0` | `variabile totale = 0` |
| ciclo | ripetere un pezzo di codice | `for n in numeri:` | `mentre i < 3 {` |
| condizione | scegliere fra rami | `if x > 0:` | `se x > 0 {` |
| ritorno | uscire da una funzione portando un valore | `return totale` | `ritorna totale` |
| import | prendere un nome da un altro file | `import os` | `importa conta da "utilita.why"` |
| effetto | un'operazione che tocca il mondo esterno (I/O) | `print("ciao")` | `open("file.txt")` |
| errore | la gestione di un problema previsto | `try:` | `except ValueError:` |
| tipo | la dichiarazione di un tipo | `class Punto:` | `interface Utente {` |
| dato | un valore scritto nel codice o una struttura di dati | `[1, 2, 3]` | `{"nome": "Rex"}` |
| blocco | un gruppo di righe tenute insieme | il corpo indentato dopo `if` | `{ ... }` dopo un `for` |
| commento | una nota per chi legge, ignorata da chi esegue | `# spiega` | `// spiega` |
| ignoto | codice non capito: si tiene cosi' com'e', senza buttarlo | una macro esotica | un decoratore mai visto |

## 6. Errori dei formati

| Codice | Quando | Cosa dice |
|---|---|---|
| E-JSON-MANCANTE | il file non c'e' | percorso del file mancante |
| E-JSON-INVALIDO | il testo non e' JSON | percorso e causa |
| E-SCHEMA | il JSON non rispetta lo schema | percorso, campo, motivo |
| E-CARTELLA | non si riesce a creare la cartella | percorso |
| E-SCRITTURA | la scrittura atomica fallisce | percorso e causa |
| E-JSONL-INVALIDO | una riga di JSONL non e' JSON | numero di riga e percorso |
| E-JSONL-SCHEMA | una riga di JSONL non rispetta lo schema | numero di riga, campo, motivo |

## 7. Modifiche

| Data | Cosa | Chi |
|---|---|---|
| 18/10/2026 | Prima stesura (Fase 0): percorsi allineati a PIANO e SPEC-06, `registro\prove\prove.jsonl` | agente WhyCode |
| 18/10/2026 | Aggiunte le 15 etichette UAST (decisione F0) e tre esempi reali di Modello di Comprensione | agente WhyCode |
