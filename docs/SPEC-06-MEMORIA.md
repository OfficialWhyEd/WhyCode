# SPEC-06: Memoria e resistenza (Livello 5)

| Campo | Valore |
|---|---|
| Progetto | WhyCode |
| Livello | 5 (Memoria e resistenza) |
| Stato | Specifica pronta per implementazione |
| Data | 17/10/2026 |
| Fonte di verita' | E:\Dev\WhyCode\PROGETTO.md (visione approvata, parole di Whyed) |
| Frase guida | "un sistema di comprensione momentanea ed adattamento che ogni volta e' sempre piu' resistente conoscendo ed adattando tutti i linguaggi" |
| Documenti collegati | PIANO-IMPLEMENTAZIONE (4.8 modulo src\memoria, 2.4 storage, appendice A formati), SPEC-02 sezione 9 (campi minimi della scheda), SPEC-04 (consuma gli idiomi), SPEC-05 (autorita' sui benchmark), SPEC-07 (registro job, token, busta modello) |
| Prerequisito di fase | Fase 5 della roadmap, ma la struttura nasce in F0 |

Questo documento e' la specifica completa della memoria di WhyCode.

Regola di lettura: un agente deve poter implementare la memoria partendo solo da qui.

Tutto quello che sta qui dentro e' verificabile con un file, un comando o un numero.

I numeri negli esempi sono dichiarati come esempio: servono a fissare la forma, non sono misure reali.

---

## 1. Scopo: ogni volta piu' resistente

### 1.1 La frase di Whyed, tradotta in numeri

"Ogni volta e' sempre piu' resistente" significa quattro cose precise, ognuna misurabile:

| Direzione | Cosa significa | Come si misura |
|---|---|---|
| Piu' veloce | Il tempo di comprensione scende giro dopo giro, sullo stesso linguaggio e sui linguaggi simili | TC: minuti dalla consegna dell'input al Modello di Comprensione valido (sezione 6) |
| Piu' preciso | La copertura dei costrutti sale e l'eredita' dai linguaggi vicini si conferma con i fatti | CC (copertura costrutti) e RI (precisione dell'eredita'), sezione 6 |
| Meno errori | Il tasso di errori scende fino a zero sui linguaggi congelati, e nessun errore chiuso si ripete | TE (errori ogni 100 righe consegnate) piu' la regressione obbligatoria (sezione 5) |
| Meno token | Lo stesso lavoro costa meno token al giro N rispetto al giro 1 | TK (token per sessione e per classe di compito), sezione 6 |

### 1.2 Cosa vuol dire "resistente", in modo verificabile

Resistente non e' una sensazione. E' la capacita' del sistema di fare meglio la seconda volta, dimostrata con numeri scritti in un registro.

Tre fatti concreti, ognuno con la sua prova:

1. **Ripasso piu' rapido.** Un linguaggio gia' studiato, ritrovato dopo giorni, si comprende in una frazione del tempo del primo studio. Prova: prova di ripasso, sezione 6.3.
2. **Vicino piu' rapido.** Un linguaggio nuovo con un vicino in KB si studia piu' in fretta del primo linguaggio della stessa famiglia. Prova: prova di vicino, sezione 6.3.
3. **Rumore innocuo.** Una frase umana scritta male non rompe la comprensione, non fa danni e non si ripete come errore. Prova: prova di rumore, sezione 6.3.

### 1.3 Come si dimostra

La dimostrazione non e' mai un racconto. E' sempre questa catena:

    misura grezza (registro vero) -> record di sessione (kb\misure) -> tabella nel report -> confronto con la soglia dichiarata

- Le misure grezze vivono nei registri gia' esistenti (comprensione, collassi, prove, job del motore, errori).
- Il record di sessione in `kb\misure\sessioni.jsonl` porta i numeri di sintesi e i riferimenti ai registri veri.
- Il report `whycode memoria report <linguaggio>` produce la tabella giro 1 contro giro N.
- Ogni soglia e' dichiarata prima (sezione 6.3). Se non si raggiunge, il fallimento si registra: non si aggiusta il criterio.

### 1.4 Cosa NON e' questa memoria

- Non e' addestramento del modello. La memoria e' fatta di dati esterni, leggibili e verificabili, non di pesi.
- Non e' una cache che scade. Le schede sono permanenti: si aggiornano, non si buttano.
- Non e' un cloud. Tutto sta in `E:\Dev\WhyCode\kb`, in formati aperti.
- Non e' la cronologia della chat. E' conoscenza strutturata: grammatica, idiomi, trappole, regole, misure.
- Non e' un database. E' un insieme di file JSON e JSONL, come deciso nel PIANO sezione 2.4.

### 1.5 La costituzione della memoria (invarianti)

Sei regole che valgono sopra ogni altra cosa in questo documento:

1. Nessuna regola diventa "attiva" senza una prova di regressione verde (sezione 5.4).
2. Nessuna scrittura su una scheda avviene senza incremento di versione e senza motivo scritto.
3. Nessuna migrazione e' distruttiva: il dato vecchio resta leggibile.
4. Nessun merge cancella una provenienza: le fonti si sommano.
5. Il modulo memoria non fa rete: importa solo da `src\condivisi`, che non ha chiamate di rete.
6. Nessun numero di crescita si dichiara senza fonte registrata: senza misura, la dichiarazione non esiste.

---

## 2. La scheda linguaggio, l'unita' base della memoria

### 2.1 Ruolo e vita di una scheda

Una scheda per linguaggio. Permanente. Cresce a ogni sessione.

La scheda risponde a tre domande: come si riconosce il linguaggio, come si capisce, come si scrive bene.

Vive in `kb\linguaggi\<linguaggio>\scheda.json`. Lo storico completo vive accanto, in `scheda.storico.jsonl` (append-only, come deciso nel PIANO sezione 4.8).

I campi minimi che la comprensione deve produrre sono elencati in SPEC-02 sezione 9: questa scheda li contiene tutti.

Stati possibili della scheda:

| Stato | Significato |
|---|---|
| bozza | Creata da eredita' o da un primo giro. Contiene elementi non verificati, marcati. |
| in-uso | Usata per generare o verificare codice. Cresce a ogni sessione. |
| completa | Copertura costrutti oltre 0,95, regressione verde, benchmark verde, zero errori aperti. |
| congelata | Non si tocca piu' salvo errore nuovo. E' la forma stabile del linguaggio. |

### 2.2 I campi, uno per uno

| Campo | Tipo | Obbligo | Cosa contiene e da dove nasce |
|---|---|---|---|
| schema | testo | si | Sempre "whyc.scheda". |
| formato | intero | si | Versione del formato della scheda. Regole in sezione 7.5. |
| id | testo | si | Identificatore globale, formato "kb:<linguaggio>". Esempio: "kb:ancora". |
| nome | testo | si | Nome leggibile. Esempio: "Ancora". |
| alias | lista di testo | no | Altri nomi con cui il linguaggio si presenta. Esempio: "ancora-dsl". |
| riconoscimento | oggetto | si | Come si riconosce: estensioni, shebang, pattern di keyword. Da SPEC-02 sezione 9. |
| famiglia | testo | si | Famiglia sintattica dalla tassonomia `kb\tassonomia.json`. Esempio: "dsl-a-flusso". |
| paradigmi | lista di testo | si | Esempio: ["dichiarativo", "a flusso"]. Usati per la distanza (sezione 4). |
| tipi | oggetto | si | sistema (statico, dinamico, assente), forte (si/no), inferenza, generici, nota. |
| ecosistema | oggetto | si | pacchetti, build, test, stile. Usato per la distanza (sezione 4). |
| stile_default | oggetto | si | indent, nomi, virgolette. Eredita' PIANO appendice A.1. |
| versione_studiata | oggetto | si | nome della versione, fonte (riferimento o esempi), data_primo_studio. |
| prima_sessione / ultima_sessione | testo | si | Id di sessione (formato S-YYYYMMDD-NNNN). |
| stato | testo | si | Uno dei quattro della sezione 2.1. |
| versione_scheda | intero | si | Contatore. Sale a ogni scrittura. |
| grammatica | oggetto | si | modo (tree-sitter, inferita, mista, fornita), riferimento (pacchetto/wasm), inferita (file BNF, iterazioni, esempi usati, confidenza), hash, provenienza. Da SPEC-02 sezione 9. |
| parser_cache | testo | no | Dove sta il parser o la grammatica locale. Esempio: "E:/Dev/WhyCode/grammatiche/ancora/". Da SPEC-02 sezione 9. |
| tabella_uast | lista di oggetti | si | Per ogni costrutto nativo: etichetta universale ed eccezioni. Da SPEC-02 sezione 9. |
| dialetto | oggetto | no | Il dialetto WhyCode associato: id, file, costrutti, stato. |
| idiomario | oggetto | si | file, voci (conteggio), categorie (conteggi). Il catalogo sta in idiomi.json (sezione 3). |
| trappole | lista di oggetti | si | Le trappole note: id, titolo, perche', contro, regola collegata. |
| esempi_canonici | lista di oggetti | si | Riferimenti: id, titolo, scopo, file, verificato (si/no). Formato file in 2.6. |
| esempi_negativi | oggetto | si | file e quanti. Gli esempi che la grammatica deve rifiutare. Da SPEC-02 sezione 9. |
| golden | oggetto | si | cartella, casi, impronta, congelato_il. Da SPEC-02 sezione 8.3. |
| uast_version | intero | si | Versione delle etichette UAST usate. Eredita' PIANO appendice A.1. |
| usi | intero | si | Contatore: sale a fine sessione se il linguaggio e' stato toccato. |
| storico_sessioni | lista di oggetti | si | Le sessioni di studio in forma compatta (sezione 2.5). |
| benchmark | oggetto | si | file, casi, ultimo_giro. Gli esiti completi stanno nel file; qui solo la sintesi. |
| regole | lista di testo | si | Id delle regole nate da questo linguaggio (sezione 5). |
| esito_test | oggetto | si | ac, cp, rr: le tre metriche di SPEC-02 sezione 8.1, ultimo valore noto. |
| provenienza | lista di oggetti | si | Da dove viene tutto: input, documentazione, chi lo ha fornito, quando. |
| salute | oggetto | si | integrita (ok/avviso/rotto), ultimo_check. Aggiornata dal controllo (sezione 7.4). |
| note | testo | no | Una riga libera. |
| campi sconosciuti | qualunque | no | Si conservano cosi' come sono. Mai buttarli (sezione 7.5). |

Regola dei percorsi: dentro i file della KB i percorsi sono relativi alla radice `kb`, con barre dritte. I percorsi fuori dalla KB (cache parser) sono assoluti, sempre con barre dritte.

### 2.3 Validazione

Lo schema eseguibile e' in zod, accanto ai tipi, come deciso nel PIANO (dipendenza `zod`).

Il documento `docs\FORMATI.md` (deliverable F0) riporta lo schema definitivo; questo documento ne e' il riferimento di progetto.

Regole di validazione:

1. Ogni scheda scritta deve passare lo schema zod. Una scheda non valida non si scrive.
2. I campi obbligatori mancanti sono errori, mai riempiti a caso.
3. Ogni lista puo' essere vuota ma deve esistere.
4. Un campo sconosciuto presente nel file si conserva: non si corregge e non si elimina.
5. Le date sono ISO 8601 con timezone (esempio: "2026-10-21T10:02:00+02:00"). Le durate sono millisecondi interi.

### 2.4 Esempio compilato: la scheda di Ancora, linguaggio inventato

Ancora e' un DSL inventato per gli esempi di questo documento: flussi di lavoro con blocchi chiusi da `fine`, keyword italiane, tipi dinamici.

La scheda e' nella versione 3, dopo tre sessioni (la storia completa e' nella sezione 10).

```json
{
  "schema": "whyc.scheda",
  "formato": 1,
  "id": "kb:ancora",
  "nome": "Ancora",
  "alias": ["ancora-dsl"],
  "riconoscimento": {
    "estensioni": [".anc"],
    "shebang": null,
    "pattern": "righe che iniziano con una di: passo, quando, ripeti, leggi, scrivi, chiama, prova"
  },
  "famiglia": "dsl-a-flusso",
  "paradigmi": ["dichiarativo", "a flusso"],
  "tipi": { "sistema": "dinamico", "forte": false, "inferenza": "nessuna dichiarazione", "generici": false, "nota": "nella concatenazione numeri e testo si convertono in silenzio" },
  "ecosistema": { "pacchetti": "nessuno, file singoli", "build": "interpretato dal fornitore", "test": "forniti dall'utente", "stile": "indentazione 2 spazi, nomi con trattino basso" },
  "stile_default": { "indent": 2, "nomi": "trattino_basso", "virgolette": "doppie" },
  "versione_studiata": { "nome": "Ancora 0.3", "fonte": "66 esempi .anc forniti da Whyed piu' 8 esempi negativi costruiti", "data_primo_studio": "2026-10-21" },
  "prima_sessione": "S-20261021-0001",
  "ultima_sessione": "S-20261025-0001",
  "stato": "completa",
  "versione_scheda": 3,
  "grammatica": {
    "modo": "inferita",
    "riferimento": null,
    "inferita": { "bnf": "linguaggi/ancora/grammatica.bnf", "iterazioni": 3, "esempi_usati": 108, "positivi": 66, "negativi": 8, "confidenza": 0.97 },
    "hash": "sha256:8f21c0a7e4d9b3f6a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4",
    "provenienza": [
      { "chi": "sessione S-20261021-0001", "quando": "2026-10-21T10:17:00+02:00", "nota": "inferenza da 26 esempi, 3 giri di correzione" },
      { "chi": "sessione S-20261022-0001", "quando": "2026-10-22T09:45:00+02:00", "nota": "aggiunti 40 esempi con casi bordo, confidenza alzata" }
    ]
  },
  "parser_cache": "E:/Dev/WhyCode/grammatiche/ancora/",
  "tabella_uast": [
    { "nativo": "passo", "etichetta": "funzione", "eccezioni": null },
    { "nativo": "quando", "etichetta": "condizione", "eccezioni": "altrimenti si lega al quando piu' vicino" },
    { "nativo": "ripeti", "etichetta": "ciclo", "eccezioni": null },
    { "nativo": "leggi", "etichetta": "effetto", "eccezioni": null },
    { "nativo": "scrivi", "etichetta": "effetto", "eccezioni": null },
    { "nativo": "chiama", "etichetta": "chiamata", "eccezioni": "argomenti per nome" },
    { "nativo": "prova/riprendi", "etichetta": "errore", "eccezioni": null },
    { "nativo": "attendi", "etichetta": "effetto", "eccezioni": "solo interi di secondi" }
  ],
  "dialetto": { "id": "dialetto:ancora", "file": "dialetti/dialetto-ancora.json", "costrutti": 7, "stato": "v1" },
  "idiomario": { "file": "linguaggi/ancora/idiomi.json", "voci": 21, "categorie": { "ciclo": 3, "errore": 3, "io": 4, "test": 3, "definizione": 4, "dati": 2, "stile-nomi": 2 } },
  "trappole": [
    { "id": "T-ancora-001", "titolo": "altrimenti si lega al quando piu' vicino", "perche": "l'indentazione non conta, conta l'ordine dei fine", "contro": "annidamenti senza fine esplicito interno", "regola": "R-0031" },
    { "id": "T-ancora-002", "titolo": "le stringhe vogliono i doppi apici", "perche": "l'apice singolo e' un apostrofo nel testo, non un delimitatore", "contro": "esempi copiati da altri linguaggi", "regola": "R-0032" },
    { "id": "T-ancora-003", "titolo": "conversione silenziosa in concatenazione", "perche": "somma con testo produce concatenazione senza errore", "contro": "conti con valori arrivati da file", "regola": "R-0033" },
    { "id": "T-ancora-004", "titolo": "nota a fine riga solo dopo doppio cancelletto", "perche": "un cancelletto singolo a meta' riga e' testo", "contro": "commenti in stile altri linguaggi", "regola": "R-0034" },
    { "id": "T-ancora-005", "titolo": "ripeti mentre controlla la condizione prima del corpo", "perche": "il primo giro puo' non avvenire mai", "contro": "abitudini da cicli con controllo finale", "regola": null },
    { "id": "T-ancora-006", "titolo": "gli argomenti di chiama sono per nome", "perche": "la posizione non conta, i nomi si'", "contro": "firme costruite per posizione", "regola": "R-0035" },
    { "id": "T-ancora-007", "titolo": "attendi senza argomento aspetta per sempre", "perche": "e' un blocco, non un ritardo", "contro": "test che non finiscono mai", "regola": null }
  ],
  "esempi_canonici": [
    { "id": "E-anc-01", "titolo": "flusso minimo: leggi, pulisci, scrivi", "scopo": "io", "file": "linguaggi/ancora/esempi/E-anc-01.json", "verificato": true },
    { "id": "E-anc-02", "titolo": "filtro su collezione con ripeti", "scopo": "ciclo", "file": "linguaggi/ancora/esempi/E-anc-02.json", "verificato": true },
    { "id": "E-anc-03", "titolo": "prova e riprendi con messaggio", "scopo": "errore", "file": "linguaggi/ancora/esempi/E-anc-03.json", "verificato": true },
    { "id": "E-anc-04", "titolo": "chiamata per nome con due argomenti", "scopo": "chiamata", "file": "linguaggi/ancora/esempi/E-anc-04.json", "verificato": true },
    { "id": "E-anc-05", "titolo": "test dichiarativo con atteso", "scopo": "test", "file": "linguaggi/ancora/esempi/E-anc-05.json", "verificato": true }
  ],
  "esempi_negativi": { "file": "linguaggi/ancora/esempi-negativi.jsonl", "quanti": 8 },
  "golden": { "cartella": "tests/golden/ancora/", "casi": 20, "impronta": "sha256:77aa11bb22cc33dd44ee55ff66aa77bb88cc99dd00ee11ff22aa33bb44cc55", "congelato_il": "2026-10-22T09:50:00+02:00" },
  "uast_version": 1,
  "usi": 4,
  "storico_sessioni": [
    { "sessione": "S-20261021-0001", "quando": "2026-10-21", "durata_ms": 1080000, "token_totali": 12400, "errori": { "gravi": 2, "medi": 0, "lievi": 1 }, "copertura": 0.63, "ri": 0.67, "esito": "scheda v1 creata" },
    { "sessione": "S-20261022-0001", "quando": "2026-10-22", "durata_ms": 420000, "token_totali": 3200, "errori": { "gravi": 1, "medi": 0, "lievi": 0 }, "copertura": 0.89, "ri": null, "esito": "scheda v2, nasce il benchmark" },
    { "sessione": "S-20261025-0001", "quando": "2026-10-25", "durata_ms": 240000, "token_totali": 1100, "errori": { "gravi": 0, "medi": 0, "lievi": 0 }, "copertura": 0.97, "ri": null, "esito": "scheda v3, completa, dialetto v1" }
  ],
  "benchmark": { "file": "linguaggi/ancora/benchmark/risultati.jsonl", "casi": 6, "ultimo_giro": { "quando": "2026-10-25T09:12:00+02:00", "verdi": 6, "rossi": 0 } },
  "regole": ["R-0031", "R-0032", "R-0033", "R-0034", "R-0035"],
  "esito_test": { "ac": 1.0, "cp": 0.97, "rr": 0.967 },
  "provenienza": [
    { "tipo": "esempi", "chi": "Whyed", "quando": "2026-10-21", "nota": "26 file .anc in laboratorio/ancora/esempi" },
    { "tipo": "esempi", "chi": "Whyed", "quando": "2026-10-22", "nota": "40 casi di bordo aggiunti" },
    { "tipo": "eredita", "chi": "kb:sagoma", "quando": "2026-10-21", "nota": "6 idiomi candidati ereditati, 4 confermati, 2 scartati" },
    { "tipo": "verifica umana", "chi": "Whyed", "quando": "2026-10-25", "nota": "confermato il significato di attendi nel caso 12" }
  ],
  "salute": { "integrita": "ok", "ultimo_check": "2026-10-25T09:30:00+02:00" },
  "note": "primo DSL a flusso studiato dopo Sagoma: la differenza sta nel legame di altrimenti e nella chiamata per nome."
}
```

### 2.5 La storia delle sessioni dentro la scheda

`storico_sessioni` e' una copia compatta: la verita' sta in `kb\misure\sessioni.jsonl` (sezione 6.2).

Ogni voce porta: id sessione, data, durata, token totali, errori per gravita', copertura, ri, esito in una riga.

Il controllo di integrita' (sezione 7.4) confronta la copia con il registro: se non coincidono, la scheda e' da rigenerare.

### 2.6 I file collegati alla scheda

| File | Cosa contiene |
|---|---|
| `idiomi.json` | Il catalogo degli idiomi del linguaggio (sezione 3). Fonte per la macchina. |
| `idiomi.md`, `trappole.md` | Viste generate, leggibili da Whyed. Mai fonte di verita': si rigenerano dalla scheda e dal catalogo. |
| `grammatica.bnf` | La grammatica inferita, in EBNF compatibile Lark (come proposto in SPEC-02 10.1). |
| `esempi/<id>.json` | Un esempio canonico per file: id, titolo, scopo, linguaggio, codice (o file), sorgente, verificato {parsa, semantica_confermata, quando}, impronta. |
| `esempi-negativi.jsonl` | Una riga per esempio negativo: contenuto, motivo del rifiuto atteso. |
| `benchmark/casi.json` | I casi di benchmark definiti. L'esecuzione e la misura spettano a SPEC-05: qui solo definizione e collegamento. |
| `benchmark/risultati.jsonl` | Una riga per giro: id, ora, tipo "benchmark", sessione, caso, esito, durata_ms. |
| `scheda.storico.jsonl` | Una riga per versione della scheda, con copia completa e motivo (sezione 7.2). |

---

## 3. L'idiomario

### 3.1 Cos'e' un idioma (e cosa non e')

Un idioma e' il modo nativo di scrivere una cosa in un linguaggio: un ciclo, un errore, un I/O, un test, una definizione.

Idioma non e' trappola. L'idioma dice come si scrive bene; la trappola dice cosa inganna e fa sbagliare.

Idioma non e' snippet casuale: ogni voce risponde a un intento universale e ha una verifica (compila, si esegue).

### 3.2 Categorie (elenco chiuso)

| Categoria | Cosa copre |
|---|---|
| ciclo | Iterare collezioni, contare, ripetere |
| condizione | Scegliere, ramificare, guardie |
| errore | Segnalare, catturare, propagare |
| io | Leggere, scrivere, file, stdin/stdout |
| test | Il modo nativo di scrivere un test vero |
| definizione | Funzioni, variabili, scope, moduli |
| dati | Strutture dati native e loro uso tipico |
| concorrenza | Processi, thread, async, solo se il linguaggio li ha |
| modulo | Import, package, organizzazione dei file |
| stile-nomi | Convenzioni di nomi e formattazione native |

L'elenco e' chiuso: per aggiungere una categoria serve una decisione scritta (sezione 11.4).

### 3.3 Formato di una voce

| Campo | Tipo | Obbligo | Cosa contiene |
|---|---|---|---|
| id | testo | si | Categoria piu' intento. Esempio: "io.leggi_file_righe". |
| categoria | testo | si | Una delle dieci della sezione 3.2. |
| intento | testo | si | Una frase universale, senza nome di linguaggio. |
| forma | testo | si | Il codice, nello stile nativo. |
| varianti | lista di testo | no | Altre forme accettate, con quando preferirle. |
| note | testo | no | Trappole vicine, limiti, casi in cui NON usarlo. |
| provenienza | oggetto | si | tipo (nativo, ereditato, importato), da, sessione. |
| verifica | oggetto | si | compila (si/no), eseguito (si/no), comando, data. |
| impronta | testo | si | sha256 della forma normalizzata (sezione 7.1). |

Esempio di voce compilata (Python):

```json
{
  "id": "io.leggi_file_righe",
  "categoria": "io",
  "intento": "leggere tutte le righe di un file di testo",
  "forma": "with open(percorso, \"r\", encoding=\"utf-8\") as f:\n    righe = f.readlines()",
  "varianti": ["lettura a righe con for riga in f, quando il file e' grande"],
  "note": "con encoding sempre dichiarato: su Windows evita sorprese; il file si chiude da solo",
  "provenienza": { "tipo": "nativo", "da": null, "sessione": "S-20261011-0001" },
  "verifica": { "compila": true, "eseguito": true, "comando": "python -m py_compile esempio.py", "data": "2026-10-11" },
  "impronta": "sha256:11ab22cd33ef44ab55cd66ef77ab88cd99ef00ab11cd22ef33ab44cd55ef66ab"
}
```

### 3.4 Esempi per due linguaggi diversi: Python e Lua

Stessi quattro intenti, due stili nativi diversi. Questo e' il cuore dell'idiomario: l'intento e' uno, la forma cambia.

**Ciclo su collezione.**

| | Python | Lua |
|---|---|---|
| Forma | `for riga in righe:` | `for i = 1, #righe do` |
| Nota | Diretto sull'elemento. | Indice da 1. Con `ipairs` per le tabelle sequenziali. |

```python
for riga in righe:
    print(riga)
```

```lua
for i = 1, #righe do
    print(righe[i])
end
```

**Errore.**

| | Python | Lua |
|---|---|---|
| Forma | `try / except` | `pcall` con due valori di ritorno |
| Nota | L'eccezione ha un tipo e un messaggio. | Niente eccezioni: l'errore e' un valore. Lo stile nativo e' `local ok, err = pcall(f)`. |

```python
try:
    valore = int(testo)
except ValueError:
    valore = None
```

```lua
local ok, valore = pcall(function() return tonumber(testo) end)
if not ok then
    valore = nil
end
```

**I/O.**

| | Python | Lua |
|---|---|---|
| Forma | `with open(...)` | `io.open` con assert e chiusura esplicita |
| Nota | Context manager, chiusura automatica. | `assert` per non proseguire su errore; chiusura sempre esplicita. |

```python
with open("input.txt", "r", encoding="utf-8") as f:
    righe = f.readlines()
```

```lua
local f = assert(io.open("input.txt", "r"))
local righe = {}
for riga in f:lines() do
    table.insert(righe, riga)
end
f:close()
```

**Test.**

| | Python | Lua |
|---|---|---|
| Forma | pytest, funzioni `test_` con assert | busted, `describe / it / assert.are.same` |
| Nota | Un file di test per modulo. | Lo stile nativo e' busted con describe annidati. |

```python
def test_pulisci_righe_vuote():
    assert pulisci(["a", "", "b"]) == ["a", "b"]
```

```lua
describe("pulisci", function()
  it("toglie le righe vuote", function()
    assert.are.same({"a", "b"}, pulisci({"a", "", "b"}))
  end)
end)
```

### 3.5 Regole di qualita' dell'idiomario

1. Ogni voce ha una verifica eseguita. Una voce mai eseguita si marca `eseguito: false` e non si usa per generare.
2. L'idioma rispetta lo stile nativo, non lo stile di un altro linguaggio. Python scritto come C non entra.
3. Ogni voce dichiara la provenienza: nativa, ereditata da un vicino, importata da una busta.
4. Le voci ereditate partono con `verifica.eseguito: false` e si promuovono solo dopo prova sul linguaggio vero.
5. SPEC-04 (sintesi) legge questo catalogo come fonte degli idiomi nel prompt e nel profilo di stile: non lo riscrive.

---

## 4. Indice e similarita'

### 4.1 kb\indice.json

L'indice e' la porta d'ingresso della KB. File unico, piccolo, rigenerabile dalle schede (decisa in PIANO sezione 3 e 4.8).

Contiene una voce per linguaggio: identita', stato, conteggi, e i campi misurati per la similarita'.

```json
{
  "schema": "whyc.indice",
  "formato": 1,
  "aggiornato": "2026-10-25T09:30:00+02:00",
  "linguaggi": [
    { "id": "kb:sagoma", "nome": "Sagoma", "famiglia": "dsl-a-flusso", "paradigmi": ["dichiarativo"], "tipi": "dinamico", "stato": "completa", "scheda": "linguaggi/sagoma/scheda.json", "versione_scheda": 5, "usi": 12, "conteggi": { "idiomi": 26, "trappole": 9, "regole": 6 } },
    { "id": "kb:ancora", "nome": "Ancora", "famiglia": "dsl-a-flusso", "paradigmi": ["dichiarativo", "a flusso"], "tipi": "dinamico", "stato": "completa", "scheda": "linguaggi/ancora/scheda.json", "versione_scheda": 3, "usi": 4, "conteggi": { "idiomi": 21, "trappole": 7, "regole": 5 } }
  ]
}
```

Regole dell'indice: si rigenera dalle schede. Mai modificato a mano in modo definitivo: una modifica a mano si registra al check successivo (sezione 7.4).

### 4.2 Le metriche di distanza

Cinque componenti, ognuna da 0 (identico) a 1 (niente in comune). La distanza totale e' la somma pesata.

I pesi iniziali, da ricalibrare sui primi cinque linguaggi studiati (sezione 11.4):

| Componente | Peso | Cosa confronta | Come si calcola (regole fisse, deterministiche) |
|---|---|---|---|
| d_sintassi | 0,35 | Famiglia sintattica | Matrice di distanza tra famiglie in `kb\tassonomia.json`. Stessa famiglia 0,0; famiglie sorelle da 0,2 a 0,4; famiglie lontane da 0,6 a 0,9; ignota 0,5. |
| d_tipi | 0,30 | Sistema di tipi | Penalita' sommate: sistema uguale 0, diverso 0,5; forza uguale 0, diversa 0,25; inferenza uguale 0, diversa 0,25. Massimo 1,0. |
| d_paradigma | 0,15 | Paradigmi | 1 meno la somiglianza di Jaccard tra le due liste di paradigmi. |
| d_ecosistema | 0,10 | Attrezzi e cultura | 1 meno (campi uguali diviso 4): pacchetti, build, test, stile. |
| d_idiomi | 0,10 | Riuso diretto | 1 meno (intenti in comune diviso intenti uniti) tra i due idiomari. |

Formula totale:

    D = 0,35 * d_sintassi + 0,30 * d_tipi + 0,15 * d_paradigma + 0,10 * d_ecosistema + 0,10 * d_idiomi

Tutte le componenti si leggono dalla scheda e dall'indice: nessun modello, nessuna approssimazione. Se un campo manca, la componente vale 0,5 e la voce si marca "distanza incerta".

### 4.3 Tabella di distanze, esempio dichiarato

Numeri di esempio, scelti come plausibili. Al primo studio vero si ricalcolano.

| A | B | d_sintassi | d_tipi | d_paradigma | d_ecosistema | d_idiomi | D | Classe |
|---|---|---|---|---|---|---|---|---|
| Python | Ruby | 0,15 | 0,20 | 0,20 | 0,25 | 0,30 | 0,20 | vicino forte |
| Python | JavaScript | 0,30 | 0,25 | 0,25 | 0,35 | 0,30 | 0,28 | vicino |
| Python | Lua | 0,50 | 0,20 | 0,25 | 0,45 | 0,35 | 0,35 | vicino |
| Python | Go | 0,60 | 0,75 | 0,45 | 0,65 | 0,60 | 0,63 | lontano |
| Go | Rust | 0,35 | 0,45 | 0,40 | 0,55 | 0,50 | 0,42 | vicino |
| C | C++ | 0,10 | 0,40 | 0,30 | 0,25 | 0,30 | 0,26 | vicino |
| JavaScript | TypeScript | 0,05 | 0,30 | 0,20 | 0,10 | 0,15 | 0,16 | vicino forte |
| Lua | Ancora | 0,35 | 0,25 | 0,35 | 0,55 | 0,40 | 0,35 | vicino |
| Sagoma | Ancora | 0,20 | 0,20 | 0,15 | 0,30 | 0,30 | 0,21 | vicino forte |
| Sagoma | Ricamo | 0,30 | 0,25 | 0,25 | 0,35 | 0,35 | 0,29 | vicino |

Verifica di un calcolo, per controllo: Python e Lua.

    0,35*0,50 + 0,30*0,20 + 0,15*0,25 + 0,10*0,45 + 0,10*0,35
    = 0,175 + 0,060 + 0,0375 + 0,045 + 0,035 = 0,35

### 4.4 Soglie e classi di vicinanza

| Classe | D | Cosa si eredita | Verifica richiesta |
|---|---|---|---|
| Vicino forte | da 0,00 a 0,25 | Tutto: struttura scheda, idiomi candidati, trappole candidate, stile, benchmark generici | Mirata: campione piu' piccolo, ma ogni elemento promosso con prova |
| Vicino | da 0,25 a 0,50 | Struttura e candidati (idiomi e trappole per categoria, tabella UAST di partenza) | Completa: ogni elemento ereditato provato sul linguaggio vero |
| Lontano | da 0,50 a 0,75 | Solo il metodo: formato scheda, checklist, casi di studio | Niente contenuti: si studia da zero, la bozza e' strutturale |
| Nuovo | oltre 0,75 | Niente | Studio da zero, scheda da zero |

### 4.5 In pratica: la bozza per eredita'

Procedura `whycode memoria simili <cartella-esempi>` piu' proposta di bozza. Sei passi:

1. **Caratteristiche.** Da almeno 10 esempi (o dalla documentazione) si estraggono: famiglia probabile, paradigmi visti, sistema di tipi, ecosistema, intenti riconoscibili.
2. **Vicini.** `cercaSimili` calcola D verso ogni scheda dell'indice e restituisce i tre piu' vicini, in ordine.
3. **Bozza.** Con il primo vicino si crea la bozza: struttura della scheda copiata, idiomi candidati per categoria, trappole candidate per causa, stile_default, tabella UAST come elenco di etichette da riempire.
4. **Marcatura.** Ogni elemento ereditato entra con provenienza {tipo: "ereditato", da: "kb:<vicino>", verificato: false}. Mai spacciato per nativo.
5. **Promozione o scarto.** Con gli esempi veri: parsa, compila, esegui. Ogni candidato si promuove (verificato: true) o si scarta con motivo. Il rapporto promossi su proposti e' RI.
6. **Registro.** La sessione scrive: vicino usato, D, RI, e i motivi degli scarti. Riferimento in `storico_sessioni` e in `kb\misure`.

Effetto pratico: la bozza non fa risparmiare la verifica, fa risparmiare la partenza. La partenza senza vicino (struttura, checklist, categorie) costa circa 15 minuti la prima volta e 2 minuti con la bozza (esempio dichiarato, coerente con PIANO F5: meno tempo e meno token a ogni giro).

### 4.6 API della similarita'

    cercaSimili(caratteristiche: Caratteristiche, quante?: number): Vicino[]

- `caratteristiche`: {famiglia?, paradigmi?, tipi?, ecosistema?, idiomi_noti?}. I campi mancanti valgono 0,5 e marcano la distanza come incerta.
- `Vicino`: {linguaggio, distanza, classe, componenti: {d_sintassi, d_tipi, d_paradigma, d_ecosistema, d_idiomi}}.
- Determinismo: stesso input, stesso ordine. A parita' di distanza vince l'id minore.
- Soglia predefinita: si restituiscono solo D minore o uguale a 0,75, salvo richiesta esplicita.

---

## 5. Apprendimento dagli errori

### 5.1 Il ciclo in sei passi

Ogni errore vero attraversa lo stesso ciclo. Nessuna scorciatoia.

1. **Errore registrato.** Una riga in `kb\errori\registro.jsonl`: cosa e' entrato, cosa ci si aspettava, cosa e' uscito, come e' stato scoperto, quanto e' costato.
2. **Analisi della causa.** Categoria da un elenco chiuso: grammatica, idioma, tipi, vincolo, rumore, incastro, verifica, altro. La causa radice si scrive in una frase.
3. **Regola nuova o aggiornata.** Una riga operativa, imperativa, con ambito (kernel, famiglia, linguaggio, idioma). Se esiste gia' una regola vicina, si aggiorna di versione invece di crearne una nuova.
4. **Test di regressione obbligatorio.** Una fixture in `kb\errori\prove\<regola>\` con ingresso e atteso. La regola non si attiva senza la prova verde.
5. **Attivazione.** La regola passa a "attiva" solo dopo il verde. Da quel momento ogni sessione che tocca quell'ambito la esegue.
6. **Chiusura dell'errore.** L'errore passa a "risolto" con il riferimento alla regola e alla prova. Zero errori chiusi senza regola o senza motivo scritto.

### 5.2 Il registro errori, formato

File: `kb\errori\registro.jsonl`. Una riga per errore, append-only, campi minimi `id`, `ora`, `tipo` (convenzione del PIANO 10.3).

```json
{"id": "E-20261009-0001", "ora": "2026-10-09T15:10:00+02:00", "tipo": "errore", "sessione": "S-20261009-0001", "linguaggio": "lua", "ingresso": "intento: funzione che somma due numeri e restituisce il totale", "atteso": "function somma(a, b) local totale = a + b return totale end", "ottenuto": "function somma(a, b) totale = a + b return totale end", "prova": "verifica di stile della scheda lua (assegnazione fuori scope)", "costo": {"durata_ms": 360000, "token": 900}, "causa": {"categoria": "idioma", "dettaglio": "in Lua le variabili nuove sono globali salvo local: la regola di scope di Python non vale"}, "stato": "risolto", "risoluzione": {"regola": "R-0007", "versione": 1, "prova": "errori/prove/R-0007/prova.json", "quando": "2026-10-09T15:16:00+02:00"}}
```

Campi obbligatori: id, ora, tipo, sessione, linguaggio, ingresso, atteso, ottenuto, prova, causa, stato.

La gravita' (grave, medio, lieve) si registra nel record di sessione, non nella riga: la riga tiene i fatti, la sessione tiene il giudizio.

### 5.3 Le regole: formato e versioni

File: `kb\errori\regole\R-<nnnn>.json`. Numerazione globale progressiva, quattro cifre.

Una regola non si cancella mai: si depreca con motivo.

```json
{
  "schema": "whyc.regola",
  "formato": 1,
  "id": "R-0007",
  "versione": 1,
  "stato": "attiva",
  "titolo": "In Lua le variabili nuove in funzione sono local",
  "testo": "Quando si scrive una funzione Lua, ogni variabile nuova va dichiarata local, salvo richiesta esplicita di un globale condiviso. Vale per ogni generazione di codice nel linguaggio lua.",
  "ambito": "linguaggio:lua",
  "nasce_da": ["E-20261009-0001"],
  "attivata_il": "2026-10-09T15:16:00+02:00",
  "prova": { "file": "errori/prove/R-0007/prova.json", "ultima_esecuzione": "2026-10-25T09:30:00+02:00", "esito": "verde" },
  "storico": [
    { "versione": 1, "quando": "2026-10-09T15:16:00+02:00", "testo": "Quando si scrive una funzione Lua, ogni variabile nuova va dichiarata local...", "motivo": "primo errore E-20261009-0001" }
  ]
}
```

Regole del versionamento:

1. Ogni modifica del testo aumenta `versione` di 1 e scrive una voce in `storico` con il testo precedente e il motivo.
2. La versione nuova torna a "proposta" e si attiva solo con la prova verde aggiornata.
3. La regola conserva solo il testo corrente in `testo`; i testi vecchi stanno in `storico`.
4. Ambiti: `kernel`, `famiglia:<nome>`, `linguaggio:<nome>`, `idioma:<categoria>`. In caso di conflitto vince la regola piu' specifica (linguaggio batte famiglia, famiglia batte kernel). Conflitto a pari specificita': stop, si registra, decide Whyed.
5. Le regole nate da un linguaggio compaiono nel campo `regole` della sua scheda.

### 5.4 Il test di regressione obbligatorio

Ogni regola attiva ha la sua fixture in `kb\errori\prove\<regola>\prova.json`:

```json
{
  "id": "R-0007",
  "regola": "R-0007",
  "creato": "2026-10-09T15:16:00+02:00",
  "casi": [
    { "nome": "somma semplice", "tipo": "codice", "ingresso": "casi/somma.ingresso.lua", "atteso": "casi/somma.atteso.lua", "comando": "luac -p" },
    { "nome": "nessun globale per sbaglio", "tipo": "controllo-stile", "ingresso": "casi/somma.ingresso.lua", "atteso": "nessuna-assegnazione-globale", "comando": null }
  ]
}
```

Il ciclo di vita:

1. Una regola e' "proposta" finche' la fixture non passa. Mai attiva prima.
2. All'attivazione si esegue anche la regressione completa dell'ambito (tutte le regole di quel linguaggio, della sua famiglia e del kernel).
3. Ogni sessione che tocca l'ambito esegue la regressione di quell'ambito e scrive l'esito in `registro\prove\.jsonl`.
4. Un rosso su una regola attiva e' un evento grave: apre un errore nuovo, non un silenzio.
5. La regressione mensile (sezione 7.3) esegue tutto il catalogo su tutti i linguaggi.

Invariante collegato (costituzione, punto 1): nessuna regola attiva senza prova verde. Un test unit del modulo memoria lo verifica proprio cosi': per ogni regola "attiva" in KB deve esistere una fixture con ultima esecuzione verde.

### 5.5 Due errori reali, con risoluzione

**Errore 1: lo scope in Lua.** Sessione S-20261009-0001. WhyCode genera una funzione Lua senza `local`. La verifica di stile della scheda lua lo intercetta (assegnazione fuori scope).

Causa: idioma. La regola di scope appresa con Python e' stata riusata per sbaglio.

Risoluzione: nasce la regola R-0007 (testo in 5.3), fixture con due casi, la scheda lua guadagna la trappola T-lua-003 e l'idioma "definizione.variabili_locali". Costo: 6 minuti, 900 token, un errore grave in piu' nella sessione. Da quel giorno nessuna funzione Lua generata senza local: la regressione lo impedisce meccanicamente.

**Errore 2: il rumore corto.** Sessione S-20261012-0001. Whyed scrive: "togli le rige vuote dal file e salva il pulito in out.txt". Il sistema tratta "rige" come un nome di variabile e produce la risposta sbagliata.

Causa: rumore. La correzione automatica esisteva (R-0011) ma copriva solo parole di 5 lettere o piu': "rige" e' lungo 4.

Risoluzione: R-0011 passa da versione 1 a versione 2.

```json
{
  "schema": "whyc.regola",
  "formato": 1,
  "id": "R-0011",
  "versione": 2,
  "stato": "attiva",
  "titolo": "Correzione del rumore per parole corte",
  "testo": "Una parola sconosciuta di lunghezza almeno 4 e distanza Damerau-Levenshtein 1 da una parola del lessico si corregge e si annota nel registro come correzione. Non correggere mai identificatori tecnici noti (nomi di file, funzioni, API) anche se a distanza 1.",
  "ambito": "kernel",
  "nasce_da": ["E-20261012-0001"],
  "attivata_il": "2026-10-12T16:40:00+02:00",
  "prova": { "file": "errori/prove/R-0011/prova.json", "ultima_esecuzione": "2026-10-25T09:30:00+02:00", "esito": "verde" },
  "storico": [
    { "versione": 1, "quando": "2026-10-12T16:20:00+02:00", "testo": "Una parola sconosciuta di lunghezza almeno 5 e distanza 1 si corregge...", "motivo": "primo errore di rumore registrato" },
    { "versione": 2, "quando": "2026-10-12T16:40:00+02:00", "testo": "Una parola sconosciuta di lunghezza almeno 4 e distanza Damerau-Levenshtein 1 si corregge...", "motivo": "la soglia 5 non copriva il caso reale: rige e' lungo 4" }
  ]
}
```

Le correzioni apprese (coppia sbagliata, giusta, contesto) si accumulano anche in `kb\frasi\correzioni.jsonl`: la regola dice la politica, la tabella tiene i casi.

---

## 6. Misura della crescita

### 6.1 Le metriche

| Metrica | Sigla | Definizione | Soglia dichiarata |
|---|---|---|---|
| Tempo di comprensione | TC | Millisecondi dalla consegna dell'input al Modello di Comprensione valido (tutti gli esempi della sessione riletti senza errore) | Prova di vicino: TC <= 0,4 * TC del primo studio del vicino piu' prossimo |
| Tasso di errore | TE | Errori ogni 100 righe consegnate, per sessione | Scende a 0 sui linguaggi congelati |
| Token consumati | TK | Token per sessione, divisi locale e maestro | Criterio PIANO F5: secondo linguaggio della stessa famiglia almeno 30% in meno del primo |
| Copertura costrutti | CC | Costrutti verificati sul totale incontrati | Scheda "completa": oltre 0,95 |
| Tasso prove | TP | Prove verdi sul totale (regressione, benchmark, fixture) | 1,0 per dichiarare "completa" |
| Precisione dell'eredita' | RI | Elementi ereditati confermati sui proposti | Prova di vicino: RI >= 0,6 |

Note di onesta': TC dipende dalla macchina e dal carico (motore acceso o spento): il record di sessione lo annota. TE si conta sulle righe consegnate, non scritte: le bozze interne non gonfiano il numero. CC usa i pesi di rilevanza di SPEC-02 sezione 8.1 (un identificatore opzionale pesa 0.5, una funzione pesa 3).

### 6.2 Dove si registrano, e cosa non si duplica

La memoria non copia le misure grezze: le aggrega e le riferisce.

| Fonte grezza | Cosa contiene | Chi la scrive |
|---|---|---|
| `registro\comprensione.jsonl` | Eventi di comprensione con ac, cp, rr (SPEC-02 sezione 8.2) | Livello 1 |
| `registro\collassi\collassi.jsonl` | Scelte del collasso con motivo (PIANO appendice A.2) | Livello 2 |
| `registro\prove\.jsonl` | Ogni esecuzione: cosa, comando, esito, durata (PIANO appendice A.4) | Livello 3 e verifica |
| Registro job del motore | Job, modello, token, esito (SPEC-07 sezione 4.5) | Motore |
| `kb\errori\registro.jsonl` | Gli errori con causa e costo (sezione 5.2) | Modulo memoria |

Il riepilogo di sessione vive in `kb\misure\sessioni.jsonl`. Una riga per sessione:

```json
{"id": "S-20261021-0001", "ora": "2026-10-21T10:02:00+02:00", "tipo": "sessione", "modalita": "studio", "linguaggio": "ancora", "linguaggi_toccati": ["ancora", "sagoma"], "durata_ms": 1080000, "tc_ms": 1080000, "token": {"locale": 11200, "maestro": 1200}, "errori": {"gravi": 2, "medi": 0, "lievi": 1, "ids": ["E-20261021-0001", "E-20261021-0002", "E-20261021-0003"]}, "righe_consegnate": 0, "copertura": {"costrutti_visti": 16, "costrutti_verificati": 10}, "prove": {"totali": 6, "verdi": 6}, "vicino_usato": {"linguaggio": "sagoma", "distanza": 0.21}, "ri": 0.67, "note": "primo incontro, grammatica inferita in 3 giri"}
```

E il riepilogo aggregato `kb\misure\riepilogo.json` (rigenerato, mai scritto a mano):

```json
{
  "schema": "whyc.riepilogo",
  "formato": 1,
  "generato": "2026-10-25T09:35:00+02:00",
  "per_linguaggio": {
    "ancora": { "sessioni": 3, "tc_ms_primo": 1080000, "tc_ms_ultimo": 240000, "token_primo": 12400, "token_ultimo": 1100, "copertura_ultima": 0.97, "errori_aperti": 0 }
  },
  "tendenze": { "media_tc_ms_primi_studi_ultimi_5": [2760000, 2460000, 1980000, 1620000, 1080000] }
}
```

Il check di integrita' confronta la copia in `storico_sessioni` con questo registro: se divergono, la scheda si rigenera.

### 6.3 Il protocollo delle tre prove

Le tre prove che dimostrano "piu' resistente". Soglie dichiarate prima. Un fallimento si registra, non si nasconde.

**Prova di ripasso.** Un linguaggio gia' in KB si riprende dopo almeno 7 giorni, con la stessa classe di compito.

Soglia: TC scende almeno del 50% e TE non peggiora rispetto al primo studio.

Esempio: Sagoma ripreso dopo 20 giorni in 6 minuti contro 46 del primo studio: meno 87%. Superata.

**Prova di vicino.** Un linguaggio nuovo con un vicino a distanza D <= 0,50 si studia col protocollo di eredita' (sezione 4.5).

Soglia: TC <= 0,4 * TC del primo studio del vicino piu' prossimo, e RI >= 0,6.

Esempio: Ancora (18 minuti) contro Sagoma primo studio (46 minuti): soglia 18,4, passata di misura. RI 4 su 6 = 0,67.

**Prova di rumore.** Le 30 frasi storte di riferimento (italiano, inglese, e la terza lingua scelta in F1) passano dalla comprensione.

Soglia: almeno 90% capite correttamente e zero fraintendimenti catastrofici.

Fraintendimento catastrofico e' definito: azione sul file sbagliato, modifica non chiesta, oppure "capito" dichiarato con confidenza alta su un intento sbagliato.

Esempio: 29 su 30 (96,7%), zero catastrofici. Superata.

Ogni prova eseguita scrive: sessione, tipo di prova, soglia, risultato, esito. Le prove fallite aprono un errore e una decisione scritta.

### 6.4 Tabella esempio della crescita (numeri dichiarati come esempio)

Primo studio di famiglia (Sagoma, 46 minuti, 18.900 token) e poi il vicino (Ancora, tre sessioni):

| Sessione | Quando | Durata | Token | Errori g/m/l | Copertura | RI | Prove | Esito |
|---|---|---|---|---|---|---|---|---|
| S-20261021-0001 | 21/10 | 18 min | 12.400 | 2/0/1 | 0,63 | 0,67 | regressione 6/6 | scheda v1 |
| S-20261022-0001 | 22/10 | 7 min | 3.200 | 1/0/0 | 0,89 | n/d | benchmark 5/6 | scheda v2 |
| S-20261025-0001 | 25/10 | 4 min | 1.100 | 0/0/0 | 0,97 | n/d | regressione 34/34, benchmark 6/6 | scheda v3 completa |

Lettura dei numeri:

- TC: 18, poi 7, poi 4 minuti. Il giro 3 costa il 22% del giro 1.
- Token: da 12.400 a 1.100, meno 91% sulla stessa classe di lavoro. Contro i 18.900 del primo studio di famiglia: meno 34% (criterio PIANO F5 superato, soglia 30%).
- Errori: 3, poi 1, poi 0. Nessun errore si e' ripetuto: la regressione li ha bloccati.
- Copertura: da 0,63 a 0,97 in tre sessioni.
- Tempo medio del primo studio, ultimi cinque linguaggi nuovi: 46, 41, 33, 27, 18 minuti. La curva scende a ogni giro: e' la frase di Whyed trasformata in un grafico.

### 6.5 La regola del numero

Vale la stessa disciplina del Livello 4: nessuna dichiarazione senza numero, nessun numero senza fonte.

Ogni numero in un report viene da: un file di registro (percorso citato), oppure un record di sessione (id citato), oppure una misura appena eseguita (comando citato). "Sembra piu' resistente" non esiste in questa KB.

---

## 7. Igiene della KB

### 7.1 Deduplicazione

Impronte (fingerprint), tutte sha256, con normalizzazione dichiarata:

| Cosa | Normalizzazione prima dell'hash |
|---|---|
| Idiomi | Codice senza spazi doppi, identificatori sostituiti con segnaposto, commenti tolti |
| Trappole | Testo in minuscolo, spazi normalizzati |
| Esempi | Hash dell'albero UAST piu' hash del sorgente normalizzato |
| Regole | Hash del testo della regola |

Regole di fusione:

1. Due elementi con la stessa impronta nella stessa categoria sono lo stesso elemento: si uniscono.
2. La fusione somma le provenienze (mai sostituisce): il campo provenienza diventa una lista con tutte le fonti.
3. Se le verifiche differiscono (una eseguita, una no), vince la piu' forte; il resto va in nota.
4. La fusione si propone con `whycode memoria dedup <linguaggio>` (dry-run di default). Il dry-run mostra: quante fusioni, quali, con che provenienze. Con `--applica` si esegue e si scrive nel log di igiene.
5. Il controllo integrita' segnala i duplicati come avviso, mai come errore bloccante.

### 7.2 Versionamento delle schede

1. Ogni scrittura di `scheda.json` incrementa `versione_scheda` di 1. Anche una correzione minima.
2. Prima di ogni scrittura si crea il backup `.bak-<data>` (convenzione del PIANO 1.2).
3. Una riga completa viene appesa a `scheda.storico.jsonl`: {versione, quando, motivo, chi, scheda}. Il motivo e' obbligatorio e cita la fonte: sessione S-..., errore E-..., migrazione, modifica a mano registrata.
4. La storia non si cancella mai. Si archivia solo con il partizionamento della sezione 7.3.
5. `salvaScheda(scheda, motivo)` e' l'unica porta di scrittura: nessun altro codice tocca i file della KB.

### 7.3 Compattazione periodica

La compattazione non distrugge: aggrega e partiziona. Si esegue a mano o a fine mese, mai in mezzo a una sessione.

Ordine delle operazioni (sempre questo):

1. `whycode memoria check` pulito (o con soli avvisi noti).
2. `whycode memoria dedup` senza `--applica`: si legge il piano.
3. Dedup vero con `--applica`.
4. Partizionamento: sessioni e storico piu' vecchi di 90 giorni passano in blocchi mensili (`sessioni-2026-07.agg.json`, `storico-2026.jsonl`) con un riassunto che conserva i numeri chiave e i riferimenti. Il dettaglio resta nei blocchi: niente si perde, tutto si legge.
5. Rigenerazione di indice e riepilogo.
6. `whycode memoria check` di nuovo.
7. Ogni passo scrive una riga in `kb\igiene\log.jsonl`: {ora, passo, esito, numeri}.

Soglie iniziali (da confermare, sezione 11.4): storico oltre 200 versioni, oppure dati oltre 90 giorni, oppure singolo file oltre 5 MB.

### 7.4 Controllo integrita'

`kb\integrita\manifest.json` contiene l'impronta sha256 di ogni file della KB. Si rigenera a ogni scrittura.

```json
{
  "schema": "whyc.manifest",
  "formato": 1,
  "generato": "2026-10-25T09:30:00+02:00",
  "file": {
    "linguaggi/ancora/scheda.json": "sha256:aa11bb22cc33dd44ee55ff66aa77bb88cc99dd00ee11ff22aa33bb44cc55dd",
    "linguaggi/ancora/idiomi.json": "sha256:bb22cc33dd44ee55ff66aa77bb88cc99dd00ee11ff22aa33bb44cc55ddee66"
  }
}
```

`whycode memoria check` verifica:

1. Ogni file del manifest esiste e l'impronta coincide.
2. Ogni riferimento a file dentro le schede punta a un file esistente.
3. Ogni regola citata in una scheda esiste in `kb\errori\regole\`.
4. Ogni regola "attiva" ha la fixture con ultima esecuzione verde (invariante 5.4).
5. Lo storico_sessioni della scheda coincide con il registro delle misure.
6. Nessun file con estensione binaria o encoding strano dentro la KB (sezione 8.3).

Codici di uscita (convenzione del PIANO 6.4): 0 pulito, 1 avvisi, 2 rotto.

Modifica a mano di un file: ammessa (i formati sono aperti), ma il check la segnala come "modificato a mano". Con `--ripara-sicuro` il sistema registra la modifica nel log, ricalcola l'impronta e rigenera le viste. Mai correzione silenziosa dei contenuti.

### 7.5 Migrazione di formato (compatibilita' futura)

Ogni file JSON della KB ha il campo `formato`. `kb\formato.json` dichiara la versione corrente per famiglia:

```json
{ "schema": "whyc.formato", "formato": 1, "correnti": { "scheda": 1, "idiomi": 1, "errore": 1, "regola": 1, "sessione": 1, "indice": 1, "busta": 1 } }
```

Regole di compatibilita':

1. Il lettore accetta la versione corrente e la precedente; se legge la precedente, la migra in memoria e lo annota.
2. Lo scrittore scrive sempre la versione corrente.
3. Le migrazioni sono funzioni pure, una per coppia di versioni, in `kb\migrazioni\<nome>_v<n>__v<n+1>.js`: leggono JSON, restituiscono JSON, non toccano mai il file di origine.
4. Procedura: `whycode memoria migra` (dry-run: mostra i file, le differenze di conteggio, i campi aggiunti) poi con `--applica`. I file vecchi restano nello storico, non si cancellano.
5. I campi sconosciuti si conservano sempre: una migrazione non perde mai un campo che non conosce.
6. Ogni migrazione passa un test golden con file di esempio della vecchia versione: `tests\golden\migrazioni\`.

Esempio di migrazione (forma della funzione, non contenuto reale):

```js
// migrazioni/scheda_v1__v2.js
// Da scheda v1 a v2: il benchmark da lista a oggetto con riepilogo.
module.exports = function daV1aV2(scheda) {
  const nuova = { ...scheda, formato: 2 };
  if (Array.isArray(nuova.benchmark)) {
    nuova.benchmark = { file: null, casi: nuova.benchmark.length, ultimo_giro: null, storia: nuova.benchmark };
  }
  return nuova;
};
```

---

## 8. Privacy e locale

### 8.1 Principio e regole di confine

Tutto vive in `E:\Dev\WhyCode\kb`. Niente cloud, niente telemetria, niente account.

La privacy non e' una promessa: e' un vincolo di architettura.

- Il modulo `src\memoria` importa solo da `src\condivisi` (regola di confine del PIANO sezione 3).
- `src\condivisi` non ha chiamate di rete.
- Un test unit verifica che nel codice compilato del modulo memoria non compaiano import di rete (fetch, http, https, net). Se compaiono, la build e' rossa.
- Il modello (WhyLocalLM) vive in `src\motore` e non scrive mai direttamente nella KB: propone, il modulo memoria scrive.
- I registri dei job del motore (token, modelli) restano locali come tutto il resto (SPEC-07).

### 8.2 Struttura cartelle completa

    E:\Dev\WhyCode\kb\
      indice.json                  elenco linguaggi, stato, conteggi (sezione 4.1)
      formato.json                 versioni correnti dei formati (sezione 7.5)
      tassonomia.json              famiglie sintattiche e matrice di distanza (sezione 4.2)
      linguaggi\
        <linguaggio>\
          scheda.json              la scheda, fonte di verita' (sezione 2)
          scheda.storico.jsonl     una riga per versione, append-only (sezione 7.2)
          idiomi.json              l'idiomario, fonte per la macchina (sezione 3)
          idiomi.md                vista generata, leggibile (mai fonte di verita')
          trappole.md              vista generata, leggibile (mai fonte di verita')
          grammatica.bnf           la grammatica inferita, se c'e' (sezione 2.6)
          esempi\
            <id>.json              un esempio canonico per file (sezione 2.6)
          esempi-negativi.jsonl    esempi che la grammatica deve rifiutare
          benchmark\
            casi.json              definizioni dei casi (misura: SPEC-05)
            risultati.jsonl        una riga per giro, append-only
          storico\                 partizioni quando lo storico cresce (sezione 7.3)
            storico-2026.jsonl
      dialetti\
        dialetto-<linguaggio>.json il posto del dialetto WhyCode (contenuto: Livello 1)
      errori\
        registro.jsonl             una riga per errore (sezione 5.2)
        regole\
          R-0007.json              le regole, numerate globali (sezione 5.3)
        prove\
          R-0007\
            prova.json             la fixture obbligatoria (sezione 5.4)
            casi\                  ingresso e atteso
      misure\
        sessioni.jsonl             una riga per sessione (sezione 6.2)
        riepilogo.json             aggregati rigenerati (sezione 6.2)
      frasi\
        rumorose.jsonl             le frasi storte di riferimento (SPEC-02 sezione 7)
        correzioni.jsonl           le coppie apprese: sbagliata, giusta, contesto
      igiene\
        log.jsonl                  una riga per passo di manutenzione (sezione 7.3)
      integrita\
        manifest.json              impronte sha256 dei file (sezione 7.4)
      migrazioni\
        scheda_v1__v2.js           funzioni pure di migrazione (sezione 7.5)
      scambi\
        <file esportati>           buste di scambio (sezione 9)

Nota: la cache dei parser non sta nella KB. Sta in `E:\Dev\WhyCode\grammatiche\<linguaggio>\`, come da SPEC-02 sezione 9; la scheda la cita in `parser_cache`.

### 8.3 Formati aperti e leggibili

1. JSON: UTF-8 senza BOM, indentazione 2 spazi, fine riga LF, chiavi nell'ordine dello schema (diff stabili).
2. JSONL: una riga per evento, una sola andata a capo finale, campi minimi id, ora, tipo.
3. Niente binari, niente compressione, niente formati proprietari. Un file si apre con il Blocco note e si legge.
4. Le viste `.md` sono generate, mai modificate a mano in modo definitivo: una modifica a mano si registra al check successivo.
5. I nomi di file e cartelle sono minuscoli, ASCII, senza spazi, come da PIANO 10.1.

### 8.4 Niente telemetria, niente cloud, e come si verifica

- Nessun contatore inviato da nessuna parte: nemmeno i crash report. Gli eventi di igiene restano in `kb\igiene\log.jsonl`.
- Verifica 1: test unit "il modulo memoria non importa rete" (sezione 8.1), eseguito a ogni `npm test`.
- Verifica 2: `whycode memoria check` segnala file anomali nella KB (binari, encoding non UTF-8, percorsi fuori da `E:\Dev\WhyCode`).
- Verifica 3: il setup e i test girano anche con internet staccato (PIANO 6.2: nessun test usa internet).

### 8.5 Backup

Il backup e' una copia della cartella `kb\`: e' autosufficiente e leggibile. Nessun cloud.

- Copia manuale consigliata a fine settimana su E: o su disco esterno.
- `kb\` e `registro\` sono versionati in git locale (PIANO 10.5): git e' una seconda rete di sicurezza.
- I backup `.bak-<data>` coprono le singole scritture; la copia della cartella copre tutto il resto.

---

## 9. Condivisione (futura, opzionale)

### 9.1 Principi

La condivisione esiste per far viaggiare una scheda tra due PC o due persone. Tre principi non negoziabili:

1. **Sempre opzionale.** Mai automatica, mai in sottofondo, mai sincronizzazione.
2. **Mai a scapito della storia.** Una scheda esportata porta con se' la sua storia: chi, quando, da dove.
3. **Mai fiducia cieca.** Una busta importata si verifica con le impronte e produce un piano prima di toccare la KB.

### 9.2 La busta di scambio (formato)

Un file JSON, aperto e leggibile: `<linguaggio>-<data>.whyscheda.json`. Il contenuto:

```json
{
  "schema": "whyc.scambio",
  "formato": 1,
  "creato": "2026-11-02T18:40:00+02:00",
  "origine": { "autore": "Whyed", "nota": "prima condivisione di prova", "versione_whycode": "0.1.0" },
  "linguaggio": "ancora",
  "storia": "completa",
  "contenuto": {
    "scheda": { "schema": "whyc.scheda", "id": "kb:ancora", "versione_scheda": 3 },
    "idiomi": [],
    "esempi": [],
    "regole": [],
    "prove_regressione": [],
    "riepilogo_misure": {}
  },
  "manifesto": { "file": { "scheda.json": "sha256:...", "idiomi.json": "sha256:..." } }
}
```

`storia` puo' essere: `omessa` (solo lo stato corrente), `essenziale` (stato corrente piu' riepilogo misure, default), `completa` (anche `scheda.storico.jsonl` e i record di sessione).

### 9.3 Esportazione

    whycode memoria esporta <linguaggio> --out <file> [--storia essenziale|completa]

1. Il comando non fa rete: scrive un file su disco, nient'altro.
2. Default: storia essenziale. Con `--storia completa` entrano anche le versioni passate e le sessioni.
3. La busta include solo le regole nate da quel linguaggio (piu' eventuali regole di famiglia citate), con le loro fixture.
4. Il manifesto delle impronte si calcola al momento e viaggia dentro la busta.
5. Esportare non modifica la KB: e' una lettura con scrittura su un file nuovo.

### 9.4 Importazione

    whycode memoria importa <file>            (dry-run: mostra il piano)
    whycode memoria importa <file> --applica  (esegue il piano)

Politiche, in ordine di applicazione:

1. **Verifica.** Impronte della busta ricalcolate e confrontate. Una busta rotta si rifiuta con il motivo, senza scrivere niente.
2. **Linguaggio nuovo.** Si crea `kb\linguaggi\<linguaggio>\` dalla busta: la scheda entra con provenienza {tipo: "importato", da: autore}, stato "bozza", `usi` a 0. La storia importata va in `storico\importato-<data>.jsonl`, separata dalla storia locale: le due storie non si fondono mai, si affiancano.
3. **Linguaggio esistente.** Non si sovrascrive niente. Si crea una versione candidata con un rapporto delle differenze (campi cambiati, idiomi nuovi, regole nuove) e si ferma li': decide Whyed (o l'agente su richiesta esplicita) con `--applica`.
4. **Regole.** Le regole importate prendono un id locale nuovo, con il campo `origine_remota` che cita l'id originale, la busta e l'autore. Due regole con lo stesso id originale ma testi diversi producono un avviso di conflitto: entrambe restano, marcate.
5. **Prove.** Le fixture importate restano attaccate alle regole importate e girano al primo check.
6. **Misure.** Le sessioni importate entrano con flag `importata: true` e non contano nelle prove di crescita locali: i numeri di un'altra macchina non sono i numeri di questa.

### 9.5 Cosa non si fa mai

- Nessuna sincronizzazione automatica, nessun "aggiorna da internet".
- Nessuna fusione silenziosa di due schede.
- Nessuna importazione senza dry-run precedente.
- Nessuna esportazione che parta da sola.

---

## 10. Esempio completo: dal primo incontro alla scheda completa

Scenario pilota con numeri dichiarati come esempio. Protagonista: Ancora, il DSL inventato della sezione 2. La KB esiste gia' da qualche settimana (Sagoma e altri linguaggi studiati prima).

### 10.1 Sessione 1: il primo incontro (S-20261021-0001, 18 minuti)

- 10:02. Whyed deposita 26 file `.anc` in `laboratorio\ancora\esempi\`. Nessuna documentazione, nessuna grammatica.
- 10:03. Classificazione: DSL mai visto, estensione sconosciuta, keyword ripetute in testa alle righe. Percorso P1b (inferenza grammaticale, SPEC-02).
- 10:05. L'indice non ha "ancora". `cercaSimili` trova: Sagoma (0,21, vicino forte), Lua (0,35), Ricamo (0,41).
- 10:06. Bozza da Sagoma: struttura scheda copiata, 6 idiomi candidati (marcati "ereditato, da verificare"), stile_default ipotizzato, checklist di verifica pronta.
- 10:08. Primo giro di inferenza BNF: accetta 26 esempi su 26, ma sbaglia il legame di `altrimenti` (errore E-20261021-0001, grave). Nasce R-0031, con fixture verde.
- 10:12. Secondo giro: le stringhe con apice singolo vengono accettate per sbaglio (errore E-20261021-0002, grave). Nasce R-0032. Terzo giro: 26 su 26 positivi, 8 su 8 negativi rifiutati.
- 10:14. UAST: 11 costrutti mappati (passo, quando, ripeti, leggi, scrivi, chiama, prova, attendi, nota, altrimenti, fine).
- 10:16. Candidati ereditati: 6 proposti da Sagoma, 4 confermati con prova, 2 scartati con motivo (RI = 0,67). Idiomi nuovi: 7. Trappole: 3 (la terza da E-20261021-0003, lieve, stile dei nomi).
- 10:18. Esempi canonici scelti (5), esempi negativi salvati (8), grammatica.bnf scritta, hash calcolato.
- 10:20. Scheda v1 salvata con motivo "primo incontro, grammatica inferita in 3 giri". Indice e manifest aggiornati. Sessione chiusa: 18 minuti, 12.400 token, errori 2 gravi e 1 lieve, copertura 0,63, regressione 6 su 6 verde.

File creati in questa sessione: `kb\linguaggi\ancora\scheda.json`, `scheda.storico.jsonl`, `idiomi.json` (11 voci), `grammatica.bnf`, `esempi\*` (5 file), `esempi-negativi.jsonl`, `kb\dialetti\dialetto-ancora.json` in bozza, piu' le righe nei registri (misure, errori, prove) e i file regole R-0031 e R-0032 con le fixture.

### 10.2 Sessione 2: espansione e primo benchmark (S-20261022-0001, 7 minuti)

- 09:40. Whyed consegna 40 esempi nuovi: annidamenti, commenti a fine riga, numeri e testo mischiati.
- 09:42. Un errore grave: la conversione implicita in concatenazione produce un risultato sbagliato in un conto arrivato da file (E-20261022-0001). Nasce R-0033.
- 09:43. Un errore lieve su un commento (`##` contro `#`): nasce R-0034, e la trappola T-ancora-004.
- 09:45. La scheda cresce: idiomi a 17 (6 nuovi), trappole a 6, copertura 0,89. Benchmark: nasce `benchmark\casi.json` con 6 casi; primo giro: 5 verdi, 1 rosso (il caso "cicli annidati").
- 09:47. Scheda v2 salvata (motivo: "sessioni S-20261022-0001: nuovi esempi, benchmark, regole R-0033 e R-0034"). Il golden set si congela (20 casi, impronta scritta).

### 10.3 Sessione 3: chiusura e scheda completa (S-20261025-0001, 4 minuti)

- 09:08. Whyed chiede: un convertitore dei flussi Ancora in JSON, con 12 test.
- 09:09. Il caso rosso dei cicli annidati si sistema; benchmark 6 su 6 verde.
- 09:10. Generazione del convertitore: zero errori al primo passaggio. Nasce R-0035 (argomenti per nome) da un dubbio di stile risolto con la verifica umana di Whyed.
- 09:11. Regressione completa dell'ambito: 34 prove su 34 verdi (tutte le regole del linguaggio, della famiglia e del kernel).
- 09:12. Prova di rumore: le 30 frasi storte di riferimento, 29 corrette (96,7%), zero fraintendimenti catastrofici.
- 09:12. Scheda v3 salvata: stato "completa". Dialetto `dialetto-ancora` v1 con 7 costrutti. Indice, riepilogo e manifest aggiornati.

### 10.4 I numeri finali

| Grandezza | Valore | Fonte |
|---|---|---|
| Sessioni | 3 (18 + 7 + 4 minuti = 29) | kb\misure\sessioni.jsonl |
| Token totali | 16.700 (12.400 + 3.200 + 1.100) | registro job motore |
| Errori | 4 totali, 0 aperti, 0 ripetuti | kb\errori\registro.jsonl |
| Copertura costrutti | da 0,63 a 0,97 | schede v1 e v3 |
| RI sulla prima eredita' | 0,67 (4 su 6) | sessione S-20261021-0001 |
| Prova di vicino | 18 min contro soglia 18,4 (0,4 * 46) | sezione 6.3 |
| Token contro il primo studio di famiglia | meno 34% (12.400 contro 18.900) | criterio PIANO F5, soglia 30% |
| Regressione finale | 34 su 34 verdi | registro\prove\.jsonl |
| Benchmark finale | 6 su 6 verdi | benchmark\risultati.jsonl |

### 10.5 Cosa resta dopo

- La scheda di Ancora e' permanente: la prossima volta che il linguaggio compare, grammatica, UAST, idiomi e trappole sono gia' pronti. Solo i costrutti nuovi costeranno tempo.
- Il dialetto `dialetto-ancora` e' la forma WhyCode che "diventa" Ancora: 7 costrutti dichiarati.
- La KB ha imparato una famiglia in piu': il prossimo DSL a flusso con D <= 0,25 verso Sagoma o Ancora partira' da una bozza quasi completa. Previsione dichiarata: TC del primo incontro sotto gli 8 minuti (da verificare con la prova di vicino; se non si avvera, si registra il fallimento e si studia il perche').
- Due regole di stile (R-0034, R-0035) e una trappola sui tipi useranno anche altri linguaggi: vivono da ora nel corredo comune della famiglia, non solo su Ancora.

---

## 11. Decisioni aperte e alternative scartate

### 11.1 Decisioni prese

| # | Decisione | Motivo |
|---|---|---|
| 1 | JSON e JSONL su disco, niente database | Allineata al PIANO 2.4: leggibilita', diff, zero dipendenze, git locale. La KB a regime sono decine di linguaggi per decine di KB ognuno: dimensione da cartella di testi, non da database. |
| 2 | Una cartella per linguaggio | Isolamento: una scheda rotta non tocca le altre; l'esportazione e' la copia di una cartella. |
| 3 | Storico append-only in JSONL | Eredita' PIANO 4.8 (`scheda.storico.jsonl`): nessuna riscrittura, replay sempre possibile. |
| 4 | Errori e regole come file singoli | Una regola per file: diff puliti, id stabili, fixture accanto. |
| 5 | Le misure di sintesi in un registro separato | La memoria aggrega e riferisce; i registri grezzi restano di chi li produce (comprensione, collasso, prove, motore). |
| 6 | Manifest di impronte a ogni scrittura | Il controllo integrita' e' meccanico e a costo quasi zero. |
| 7 | Solo formati aperti, niente compressione | Whyed deve poter aprire tutto; il costo in MB e' irrilevante a questa scala. |
| 8 | Un solo scrittore per porta: `salvaScheda` | Regola del PIANO 9.1 applicata ai dati: niente scritture parallele sui file della KB. |

### 11.2 Alternative scartate, con motivo

| Alternativa | Perche' scartata |
|---|---|
| SQLite dal primo giorno | Un database binario non si legge con il Blocco note, va migrato, e a questa scala non serve. Soglia e percorso definiti in 11.3: si passa solo con numeri alla mano. |
| Un unico grande JSON per tutta la KB | Un file unico: un errore di scrittura rovina tutto, i diff sono illeggibili, due sessioni non possono lavorare su linguaggi diversi. |
| Schede in Markdown come fonte primaria | Il markdown e' comodo da leggere ma fragile da validare, deduplicare e migrare. Scelta: JSON fonte, Markdown vista generata. Il PIANO elenca idiomi.md e trappole.md: restano, come viste. |
| Database di vettori (embedding) per la similarita' | Pesa sulla RAM del PC di Whyed, aggiunge dipendenze, e le metriche a regole (sezione 4.2) sono spiegabili e deterministiche. Si rivaluta solo se le regole non bastano (sezione 11.4). |
| Memoria nei pesi del modello (fine-tuning continuo) | Contro la filosofia: la memoria deve essere esterna, ispezionabile, annullabile. Un peso non si legge e non si corregge a mano. |
| Sincronizzazione cloud o git remoto della KB | Privacy prima di tutto: l'unico modo in cui una scheda esce dal PC e' una busta esportata a mano (sezione 9). |
| Una scheda per famiglia invece che per linguaggio | Le differenze dentro una famiglia sono sostanziali (Ancora contro Sagoma docet). L'eredita' tra simili (sezione 4.5) copre gia' il riuso: la scheda resta per linguaggio. |
| Deduplicazione automatica a ogni scrittura | Rischio di fondere cose diverse a meta' sessione. Scelta: proposta in dry-run, applicazione esplicita (sezione 7.1). |
| Storicizzare tutto dentro la scheda (blow-up del file) | La scheda deve restare piccola e leggibile. Lo storico vive accanto, in JSONL. |

### 11.3 Quando passare a SQLite

Vale la soglia generale dichiarata nel PIANO sezione 12 riga 6 (registro oltre 20.000 righe o query oltre 2 secondi), piu' queste soglie specifiche della KB:

1. `kb\indice.json` oltre 500 linguaggi, oppure caricarlo prende piu' di 300 ms.
2. Una ricerca sull'idiomario (testo o categoria, su tutti i linguaggi insieme) diventa un'operazione frequente e lenta.
3. `kb\misure\sessioni.jsonl` oltre 50.000 righe.
4. Piu' processi scrivono sulla KB in parallelo con frequenza.

Se e quando una soglia scatta: SQLite entra **solo come indice derivato**, mai come fonte di verita'. I file JSON restano la verita'; il database si rigenera dai file con un comando. Procedura: agente propone con i numeri, Whyed approva (stessa disciplina del PIANO).

### 11.4 Decisioni aperte

| # | Cosa | Si decide in | Chi decide | Come |
|---|---|---|---|---|
| 1 | I pesi della similarita' (0,35 / 0,30 / 0,15 / 0,10 / 0,10) | inizio F5, dopo i primi 5 linguaggi | agente propone, Whyed approva | confronto pesi attuali contro pesi calibrati sulle distanze vere; tabella prima/dopo nel report |
| 2 | Le soglie di partizionamento (200 versioni, 90 giorni, 5 MB) | dopo 3 mesi d'uso | agente propone, Whyed approva | misure reali di dimensione e tempi di check |
| 3 | La soglia RI (0,6) della prova di vicino | dopo le prime 5 coppie di vicini | agente propone | distribuzione dei RI misurati: se tutti sono sopra 0,8 la soglia si alza |
| 4 | La numerazione delle regole importate (proposta: id locale nuovo, origine remota citata) | alla prima importazione vera | Whyed | si prova su una busta di prova prima di esportare fuori |
| 5 | Deduplicazione automatica a ogni sessione o solo su richiesta | dopo i primi 10 linguaggi | agente propone | conteggio dei duplicati trovati dal check nel tempo |
| 6 | La visualizzazione delle viste `.md` (quanto ricche) | F5 | Whyed guarda, agente propone | si parte minime: tabelle idiomi e trappole, niente prosa |

---

## Appendice A. API e comandi della memoria

Modulo: `src\memoria` (allineato a PIANO 4.8, esteso dove serve). Importa solo da `src\condivisi`.

| Funzione | Firma | Cosa fa |
|---|---|---|
| caricaScheda | (linguaggio) -> SchedaLingua o null | Legge e valida la scheda. Non scrive. |
| salvaScheda | (scheda, motivo) -> void | Backup, versione +1, riga di storico, indice, manifest. Unica porta di scrittura. |
| caricaIdiomi | (linguaggio) -> Idiomario | Legge e valida l'idiomario. |
| salvaIdiomi | (linguaggio, idiomario, motivo) -> void | Come salvaScheda, per il catalogo. |
| cercaSimili | (caratteristiche, quante?) -> Vicino[] | Distanze e classi (sezione 4.6). |
| impara | (comprensione, numeri) -> SchedaLingua | Chiude una sessione e aggiorna la scheda. E' il pezzo di PIANO 4.8. |
| registraErrore | (errore) -> id | Appende al registro errori. |
| proponiRegola | (errore) -> Regola | Crea la regola in stato proposta. |
| attivaRegola | (id, versione) -> Esito | Fallisce se la fixture non e' verde. |
| verificaRegole | (ambito?) -> Esito[] | Regressione: esegue le fixture dell'ambito. |
| registraSessione | (sessione) -> void | Appende a `kb\misure\sessioni.jsonl`. |
| riepiloga | () -> Riepilogo | Rigenera `kb\misure\riepilogo.json`. |
| controllaIntegrita | () -> Esito | Check con codici 0, 1, 2 (sezione 7.4). |
| esportaBusta | (linguaggio, opzioni) -> Busta | Scrive la busta di scambio (sezione 9.3). |
| importaBusta | (busta, {applica}) -> PianoImport | Dry-run o esecuzione (sezione 9.4). |
| migraFormato | (dryRun) -> Esito | Migrazioni di formato (sezione 7.5). |

Comandi CLI (dentro `tools\whycode.ts`, stile del PIANO 6.4, uscita 0 / 1 / 2):

    whycode memoria vedi [linguaggio]        mostra scheda e conteggi (esiste da F0)
    whycode memoria simili <esempi|linguaggio>
    whycode memoria report <linguaggio|globale>
    whycode memoria check [--ripara-sicuro]  integrita', avvisi, codici di uscita
    whycode memoria dedup <linguaggio> [--applica]
    whycode memoria compatta [--applica]
    whycode memoria migra [--applica]
    whycode memoria esporta <linguaggio> --out <file> [--storia essenziale|completa]
    whycode memoria importa <file> [--applica]

Ogni comando multi-passo produce un REPORT con una riga per passo: stato OK / SALTATO / FALLITO, motivo, durata.

## Appendice B. Glossario minimo

| Termine | Significato |
|---|---|
| Scheda | L'unita' base della memoria: tutto quello che WhyCode sa di un linguaggio. |
| Idiomario | Il catalogo degli idiomi di un linguaggio (sezione 3). |
| Idiomario, idioma | Il modo nativo di scrivere una cosa (ciclo, errore, io, test) in un linguaggio. |
| Trappola | Una cosa che inganna la comprensione o la generazione in un linguaggio. |
| Regola | Una riga operativa nata da un errore, con prova di regressione e versione. |
| Prova (fixture) | Ingresso e atteso che verifica una regola. |
| Sessione | Un giro di lavoro continuo con WhyCode, identificato da S-YYYYMMDD-NNNN. |
| TC / TE / TK / CC / TP / RI | Le sei metriche della crescita (sezione 6.1). |
| Vicino | Un linguaggio gia' in KB con distanza D bassa, usato per la bozza. |
| RI | Precisione dell'eredita': elementi ereditati confermati sui proposti. |
| Busta | Il file di scambio per esportare o importare una scheda (sezione 9). |

