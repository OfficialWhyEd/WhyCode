# SPEC-04: Sintesi e incastro (Livello 3) e interoperabilita'

| Campo | Valore |
|---|---|
| Progetto | WhyCode |
| Livello | 3 (Sintesi e incastro) + modulo Interop |
| Stato | Specifica pronta per implementazione |
| Data | 17/10/2026 |
| Fonte di verita' | E:\Dev\WhyCode\PROGETTO.md (visione approvata, parole di Whyed) |
| Frase guida | "studiarlo al momento e inventarne uno che si incastri" |
| Documenti collegati | SPEC-01 (kernel), SPEC-02 (comprensione), SPEC-03 (spazio quantico). Questa specifica consuma i loro output, non li ridefinisce. |
| Prerequisito di fase | Fase 2 della roadmap (da WhyCode verso Python, JavaScript, C) |

Questo documento definisce come WhyCode trasforma un intento compreso (Modello di
Comprensione) in codice reale: scritto nel linguaggio giusto, incastrato nello stile
del repo ospite, legato ad altri linguaggi quando conviene, e verificato prima di
dirsi fatto.

---

## 1. Scopo e principi

### 1.1 Cosa fa il Livello 3

Il Livello 3 e' il compositore. Prende:

- il Modello di Comprensione (output del Livello 1): cosa va fatto, con contratti,
  invarianti, casi di bordo, esempi;
- i vincoli (dal Livello 2): linguaggio di uscita, piattaforma, memoria, stile;
- il repo ospite: il codice dove il risultato deve vivere.

E produce:

- codice sorgente nel linguaggio target;
- test;
- prove di verifica (compilazione, esecuzione, test);
- il registro del collasso con la motivazione della scelta.

### 1.2 I tre principi

1. **Realizzare l'intento.** L'input e' un significato, non un testo da copiare.
   Il codice di uscita nasce dall'intento e dalle regole del linguaggio target.
2. **Incastrarsi nel contesto.** Il codice deve sembrare scritto da chi vive in
   quel repo: stessi nomi, stessa formattazione, stessi import, stessi idiomi,
   stesso stile di test. Un estraneo che legge non deve notare la cucitura.
3. **Verificare sempre.** Prima di dire "fatto": il codice compila (o si importa),
   si esegue, passa i test del repo e i test generati. Ogni prova si registra
   con comando, output e impronta (hash).

### 1.3 Cosa NON e' (per evitare equivoci)

- **Non e' traduzione riga per riga.** Non esiste un sorgente da mappare uno a uno.
  Esiste un intento. La traduzione fedele di un altro file e' semmai un caso
  particolare, e comunque non promessa e non garantita.
- **Non e' copia di snippet dalla memoria del modello.** Il codice si compone per
  quel contesto (varianti, collasso, verifica). Copiare un blocco "simile" senza
  prova di correttezza e' vietato dal principio 1.2.3.
- **Non e' riscrittura totale del repo.** Si tocca il minimo indispensabile.
  Di default si creano file nuovi. Un file esistente si modifica solo se serve
  e solo con prova dei test dell'intero repo.
- **Non e' consegna senza prove.** Senza report dei test e voce di registro,
  il risultato si chiama "bozza non verificata", mai "fatto".

### 1.4 Ordine dei criteri di scelta (dal Livello 2, non negoziabile)

1. Correttezza.
2. Incastro.
3. Prestazioni.
4. Stile fine (micro-preferenze estetiche).

La correttezza non si negozia. Se il profilo di stile chiede qualcosa che rompe
la correttezza, vince la correttezza e l'eccezione viene registrata.

### 1.5 Definizione di "fatto" per questo livello

Un lavoro del Livello 3 e' fatto quando esistono, in ordine:

1. il codice, nella posizione giusta del repo;
2. i test (del repo e generati) che lo coprono;
3. il report delle verifiche, con tutti i livelli verdi o motivati;
4. il registro del collasso, con la variante scelta e perche';
5. l'istruzione per rifare le prove.

Manca anche uno solo di questi: non e' fatto.

---

## 2. Pipeline di sintesi

Da Modello di Comprensione a codice target, passo per passo.
Regola generale di sicurezza: **il modello AI non tocca mai da solo il filesystem
del repo ospite**. Il modello propone (JSON, testo, diff). Un codice deterministico
di WhyCode applica, salva, esegue e registra.

### 2.1 Input formale: cosa serve dal Modello di Comprensione

Campi minimi richiesti dalla sintesi (estensione di SPEC-02, qui solo i consumati):

```json
{
  "intento": "una frase operativa, es. 'calcolare la mediana di una lista di numeri'",
  "contratto": {
    "nome": "mediana",
    "input": [{"nome": "valori", "tipo_neutro": "seq<f64>", "modificabile": false}],
    "output": {"tipo_neutro": "f64"},
    "errori": [{"caso": "sequenza vuota", "comportamento": "errore esplicito"}]
  },
  "invarianti": ["l'input non viene modificato", "il risultato non dipende dall'ordine di input"],
  "casi_bordo": ["lista vuota", "un elemento", "valori uguali", "numeri negativi", "presenza di NaN"],
  "effetti": ["purezza: nessun I/O, nessuno stato globale"],
  "esempi": [
    {"input": [[3, 1, 2]], "output": 2.0},
    {"input": [[4, 1, 3, 2]], "output": 2.5}
  ],
  "vocabolario_repo": {"parole_gia_presenti": ["mediana", "media", "statistica"]},
  "fonte": "frase di Whyed / file di origine / esempi",
  "confidenza": 0.93
}
```

Se un campo essenziale manca (per esempio: cosa fare sul caso vuoto), la pipeline
si ferma al passo S0 e chiede, con una sola domanda a bottoni. Non inventa.

### 2.2 I passi

| Passo | Nome | Chi lavora | Input | Output |
|---|---|---|---|---|
| S0 | Caricamento e controllo contratto | regole fisse | UM + vincoli + radice repo | contratto consolidato + eventuali domande |
| S1 | Studio del contesto | regole + modello (solo idiomi e docstring) | repo ospite | Profilo di Stile (sezione 3) + ambiente rilevato |
| S2 | Piano di realizzazione | modello + regole | contratto + profilo | da 1 a 5 piani candidati (JSON) |
| S3 | Generazione vincolata | modello (con decodifica vincolata) + regole | piano + profilo | codice + test, gia' formattati |
| S4 | Verifica a livelli | regole fisse | codice + test | report dei livelli (sezione 6) |
| S5 | Correzione mirata | modello | errore esatto | patch minima; ritorno a S4 |
| S6 | Collasso e registro | regole fisse | esiti di tutte le varianti | variante scelta + voce di registro |
| S7 | Ottimizzazione (se richiesta) | Livello 4 | variante scelta | benchmark before/after misurato |
| S8 | Consegna | regole fisse | tutto quanto sopra | pacchetto ordinato (sezione 7) |

### 2.3 Dettaglio dei passi

**S0 Caricamento.** Verifica che l'UM abbia i campi minimi di 2.1. Calcola
`intento_hash = sha256(intento normalizzato)` e `vincoli_hash = sha256(vincoli
normalizzati + versione_regole)`. Questi due hash determinano tutto il resto.
Se il repo non esiste o non e' scrivibile: stato ANNULLATO-AMBIENTE.

**S1 Studio del contesto.** Costruisce il Profilo di Stile (sezione 3). Rileva
l'ambiente: versioni di python, node, gcc/clang, gestori di pacchetti, formatter
presenti. Verifica che la toolchain basti per la verifica prevista. Se no: stato
NON-VERIFICABILE-AMBIENTE (si consegna il piano, non un falso "verificato").

**S2 Piano di realizzazione.** Il modello propone da 1 a N piani (default 2, mai
piu' di 5). Ogni piano e' un JSON, non codice:

```json
{
  "variante": 2,
  "strategia": "modulo nuovo, riusa le convenzioni di pulizia.py, nessuna libreria nuova",
  "file_creati": ["src/puliscifile/mediana.py", "tests/test_mediana.py"],
  "file_toccati": [],
  "librerie": [],
  "punti_di_integrazione": ["src/puliscifile/__init__.py: export"],
  "test_previsti": 6,
  "rischi": ["nessuno rilevante"],
  "stima_righe": 35
}
```

Regole del piano: preferire librerie gia' presenti nel repo; dichiarare ogni
libreria nuova con motivo; ogni piano dichiara i test che lo accompagneranno.

**S3 Generazione vincolata.** Per ogni piano, il modello genera il codice.
Se il runtime del modello locale supporta la decodifica vincolata dalla grammatica
(risultato di ricerca citato in PROGETTO.md: i vincoli di schema e grammatica
battono modelli molto piu' grandi), si usa: il testo prodotto e' garantito
sintatticamente valido nel linguaggio target. Se non e' supportata, dopo la
generazione si esegue comunque il Livello 1 di verifica (parser) e si rigenera
al massimo 2 volte se non parsa.
Il prompt di generazione contiene, sempre e in quest'ordine: contratto, profilo
di stile in forma compatta, esempi, vincoli duri del profilo, divieti (sezione 9).
Il seed della generazione e' deterministico:
`seed = sha256(intento_hash + vincoli_hash + versione_regole + variante_id)`.

**S4 Verifica.** Sezione 6. Nessuna eccezione.

**S5 Correzione mirata.** Se S4 fallisce: il modello legge l'errore esatto
(output del compilatore o del test) e produce la patch minima. Regole:

- una patch per tentativo, minimale, con diff registrato;
- due errori identici consecutivi: non si insiste, si cambia strategia
  (si passa a un'altra variante di S2, oppure si torna a S2 con il dato nuovo);
- massimo 5 tentativi per variante (default, decisione aperta in sezione 10);
- ogni tentativo entra nel registro con: numero, classe di errore, ipotesi,
  hash del diff, esito.

**S6 Collasso.** Quando tutte le varianti hanno un esito, si sceglie con l'ordine
di 1.4 (correttezza, incastro, prestazioni, stile). La scelta e' una funzione
deterministica di (intento_hash, vincoli_hash, esiti, versione_regole). Stesso
input, stessa scelta. Il replay si testa: due esecuzioni con stessi hash devono
produrre lo stesso id scelto nel registro.

**S7 Ottimizzazione.** Solo se richiesta dai vincoli. Passa al Livello 4.
Regola dura: nessuna parola "ottimizzato" senza file di benchmark (sezione 7).

**S8 Consegna.** Sezione 7.

### 2.4 Ruolo del modello AI, in chiaro

| Passo | Il modello fa | Il modello non fa |
|---|---|---|
| S0 | niente | tutto regole |
| S1 | classifica idiomi, stile docstring, lingua dei commenti | non legge il repo a mano: legge i riassunti deterministici |
| S2 | propone i piani | non scrive ancora codice |
| S3 | scrive codice e test secondo piano e profilo | non decide dove salvare: applica WhyCode |
| S4 | niente | tutto regole |
| S5 | analizza l'errore e propone la patch minima | non tocca file da solo |
| S6 | niente | tutto regole |
| S7 | propone varianti migliorative | non dichiara guadagni: parlano i numeri |

Motore di default: WhyLocalLM in locale. Un modello frontier solo come maestro
opzionale. La pipeline non ha mai il cloud come obbligo. Senza modello disponibile:
S1 (parte deterministica) e S2 vanno in stato MODELLO-ASSENTE e si consegna il
profilo di stile piu' un piano vuoto con la spiegazione. Non si finge nulla.

---

## 3. Analizzatore di stile del repo ospite

### 3.1 Cosa legge, campo per campo

Principio: **deterministico prima, modello dopo.** Tutto cio' che si puo' contare,
si conta. Il modello interviene solo dove serve giudizio (idiomi, tono dei
commenti). Ogni campo del profilo cita la sua fonte (file:riga) e una confidenza
da 0 a 1.

| Gruppo | Cosa legge | Metodo | Esempio di evidenza |
|---|---|---|---|
| Naming e casing | funzioni, variabili, classi, costanti, moduli, file, test | AST + regex, conteggio | `leggi_righe` snake_case in 14 funzioni su 14 |
| Formattazione | indentazione (tipo e larghezza), riga massima, virgolette, punto e virgola, virgola finale, newline (LF o CRLF), spazi attorno agli operatori | conteggio righe + config formatter | 4 spazi, riga max 88 da `[tool.ruff]` |
| Import e ordinamento | gruppi (standard, terze parti, locali), riga vuota tra gruppi, alias, import relativi, `from __future__` | AST degli import + verifica ordine | standard, riga vuota, locali |
| Idiomi ricorrenti | Python: comprehension contro cicli con append, context manager, f-string, pathlib. JS: arrow contro function, async/await, destructuring. C: cicli con size_t, goto cleanup, codici di errore | conteggio pattern + modello per la classificazione | comprehension usata in 9 casi su 10 |
| Commenti e docstring | stile (Google, NumPy, JSDoc, Doxygen), lingua (italiano o inglese), densita' (commenti per 100 righe), commenti a fine riga | regex + modello per stile e lingua | docstring Google in italiano |
| Struttura file e cartelle | layout (src layout oppure piatto), dove stanno i moduli, dove stanno i test, nomi dei file | albero file | `src/puliscifile/`, `tests/` |
| Versione linguaggio | da manifest e config: `requires-python`, `engines`, `-std=`, `CXX_STANDARD`, `tsconfig target` | lettura manifest | `>=3.11` da pyproject.toml |
| Framework e librerie | dai manifest e dai lockfile, piu' frequenza d'uso negli import | parsing manifest + conteggio | nessuna dipendenza runtime |
| Pattern di test | framework (pytest, unittest, jest, node:test, CTest), stile assert, nomi dei test, fixture | AST dei test + convenzioni | pytest, assert semplici, `test_*` |
| Tool gia' configurati | formatter, linter, type checker e i loro comandi | file di config | ruff, pytest |

Regole dell'analizzatore:

1. Si guardano prima i file piu' rappresentativi: quelli con piu' righe e piu'
   recenti (data da git, se disponibile; altrimenti ordine alfabetico stabile).
2. Si ignora il codice generato e le cartelle di terze parti (`.venv`,
   `node_modules`, `vendor`, `build`), elencate in una lista fissa piu' i file
   `.gitignore` letti dal repo.
3. Ogni conteggio salva il campione: quali file, quante occorrenze. Un campo
   senza almeno 3 occorrenze non diventa mai vincolo duro.
4. Lo stesso repo produce sempre lo stesso profilo: ordinamenti stabili, nessun
   elemento casuale, `generato_il` escluso dall'hash.

### 3.2 Formato del Profilo di Stile

JSON, versione 1.0. Campi, tipi, obbligatorieta':

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `profilo_versione` | string | si | "1.0" |
| `generato_il` | string ISO | si | istante di generazione (fuori dall'hash) |
| `repo.radice` | string | si | percorso del repo |
| `repo.hash_albero` | sha256 | si | impronta dell'albero analizzato (riproducibilita') |
| `linguaggi` | array di {linguaggio, versione_minima, fonte} | si | uno o piu' linguaggi principali |
| `naming` | mappa categoria verso {stile, fonti[], confidenza} | si | categorie: funzioni, variabili, classi, costanti, file, test |
| `formattazione` | oggetto: indentazione {tipo, larghezza}, riga_max, virgolette, spazi_operatori, righe_vuote_tra_funzioni, newline | si | piu' i campi `fonte_*` che citano le prove |
| `import` | oggetto: ordine_gruppi, separatore_gruppi, from_future, alias, fonti | si | solo per linguaggi con import |
| `idiomi` | array di {descrizione, esempi_fonti[], controesempi[], confidenza} | si | puo' essere vuoto |
| `commenti` | oggetto: stile_docstring, lingua, densita, stile_riga, fonte | si | |
| `struttura` | oggetto: layout, cartella_moduli, cartella_test, nomi_file_test | si | |
| `test` | oggetto: framework, stile_assert, nomi, fixture, comando | si | `comando` = quello vero che fa girare i test |
| `dipendenze` | oggetto: runtime[], sviluppo[], gestore, fonte_lock | si | |
| `strumenti` | oggetto: formatter, linter, tipo_checker, comandi[] | no | se presenti si usano |
| `vincoli_duri` | array di stringhe | si | derivati: cio' che la generazione DEVE rispettare |
| `liberta` | array di stringhe | si | cio' che non e' vincolato |
| `avvisi` | array di stringhe | si | ambiguita', conflitti, campi a bassa confidenza |

Ogni voce di `naming`, `idiomi`, `commenti` porta `fonti` (elenco file:riga) e
`confidenza`. Regola: confidenza sotto 0.6 significa "campo traballante": entra
in `avvisi` e non genera vincoli duri.

### 3.3 Esempio compilato su un repo Python vero

Repo di prova: `puliscifile`, un piccolo strumento che toglie le righe vuote da
un file di testo. Il repo e' vero nel senso che tutto quello che segue e'
eseguibile cosi' com'e'.

Albero:

```text
puliscifile/
  pyproject.toml
  src/
    puliscifile/
      __init__.py
      cli.py
      pulizia.py
  tests/
    test_pulizia.py
```

`pyproject.toml` (estratto):

```toml
[project]
name = "puliscifile"
version = "0.3.1"
requires-python = ">=3.11"
dependencies = []

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

`src/puliscifile/pulizia.py` (estratto):

```python
from __future__ import annotations

from pathlib import Path


def leggi_righe(percorso: Path) -> list[str]:
    """Legge un file di testo e restituisce le righe senza ritorni a capo.

    Args:
        percorso: percorso del file da leggere.

    Returns:
        Le righe del file, senza carattere di fine riga.
    """
    testo = percorso.read_text(encoding="utf-8")
    return testo.splitlines()


def rimuovi_righe_vuote(righe: list[str]) -> list[str]:
    """Toglie le righe vuote o fatte solo di spazi."""
    return [riga for riga in righe if riga.strip()]
```

`tests/test_pulizia.py` (estratto):

```python
from puliscifile.pulizia import rimuovi_righe_vuote


def test_rimuove_vuote():
    assert rimuovi_righe_vuote(["ciao", "", "  ", "mondo"]) == ["ciao", "mondo"]


def test_lista_vuota():
    assert rimuovi_righe_vuote([]) == []
```

Profilo di stile compilato (estratto con le fonti vere):

```json
{
  "profilo_versione": "1.0",
  "generato_il": "2026-10-17T15:20:00+02:00",
  "repo": {
    "radice": "E:/Dev/esperimenti/puliscifile",
    "hash_albero": "sha256:9c41...b7e2"
  },
  "linguaggi": [
    {"linguaggio": "python", "versione_minima": "3.11", "fonte": "pyproject.toml:5"}
  ],
  "naming": {
    "funzioni": {"stile": "snake_case", "fonti": ["src/puliscifile/pulizia.py:6", "src/puliscifile/pulizia.py:20", "tests/test_pulizia.py:4"], "confidenza": 1.0},
    "variabili": {"stile": "snake_case", "fonti": ["src/puliscifile/pulizia.py:18"], "confidenza": 1.0},
    "classi": {"stile": "assenti", "fonti": [], "confidenza": 0.0},
    "costanti": {"stile": "assenti", "fonti": [], "confidenza": 0.0},
    "file": {"stile": "snake_case", "fonti": ["src/puliscifile/pulizia.py", "tests/test_pulizia.py"], "confidenza": 1.0},
    "test": {"stile": "test_funzione_descrive", "fonti": ["tests/test_pulizia.py:4"], "confidenza": 1.0}
  },
  "formattazione": {
    "indentazione": {"tipo": "spazi", "larghezza": 4},
    "riga_max": 88,
    "virgolette": "doppie",
    "spazi_operatori": true,
    "righe_vuote_tra_funzioni": 2,
    "newline": "lf",
    "fonte_virgolette": "src/puliscifile/pulizia.py:19 (stringhe con virgolette doppie in 6 casi su 6)",
    "fonte_riga_max": "pyproject.toml:9"
  },
  "import": {
    "ordine_gruppi": ["standard", "terze_parti", "locali"],
    "separatore_gruppi": "riga vuota",
    "from_future": true,
    "alias": "nessuno osservato",
    "fonti": ["src/puliscifile/pulizia.py:1-4"]
  },
  "idiomi": [
    {"descrizione": "lista comprehension al posto di cicli con append", "esempi_fonti": ["src/puliscifile/pulizia.py:24"], "controesempi": [], "confidenza": 0.9},
    {"descrizione": "pathlib.Path al posto di os.path", "esempi_fonti": ["src/puliscifile/pulizia.py:16"], "controesempi": [], "confidenza": 0.8},
    {"descrizione": "guard clause per gli errori (controllo presto, raise presto)", "esempi_fonti": [], "controesempi": ["src/puliscifile/cli.py:12"], "confidenza": 0.4}
  ],
  "commenti": {
    "stile_docstring": "google",
    "lingua": "italiano",
    "densita": "media: docstring sulle funzioni pubbliche, pochi commenti interni",
    "stile_riga": "cancelletto minuscolo, frasi corte",
    "fonte": "src/puliscifile/pulizia.py:7-15"
  },
  "struttura": {
    "layout": "src",
    "cartella_moduli": "src/puliscifile",
    "cartella_test": "tests",
    "nomi_file_test": "test_<modulo>.py"
  },
  "test": {
    "framework": "pytest",
    "stile_assert": "assert semplici, nessuna classe",
    "nomi": "test_<cosa>",
    "fixture": "assenti (da introdurre solo se servono)",
    "comando": "python -m pytest tests -q"
  },
  "dipendenze": {
    "runtime": [],
    "sviluppo": ["pytest", "ruff"],
    "gestore": "pip + pyproject",
    "fonte_lock": "assente"
  },
  "strumenti": {
    "formatter": "ruff format",
    "linter": "ruff check",
    "tipo_checker": "assente",
    "comandi": ["python -m ruff check src tests", "python -m ruff format --check src tests"]
  },
  "vincoli_duri": [
    "funzioni e variabili in snake_case",
    "indentazione 4 spazi",
    "stringhe con virgolette doppie",
    "docstring in italiano, stile Google",
    "test con pytest, assert semplici, nomi test_*",
    "nessuna nuova dipendenza runtime senza motivo dichiarato"
  ],
  "liberta": [
    "algoritmo interno",
    "struttura dei file nuovi (purché stiano in src/puliscifile)",
    "messaggi di errore (in italiano, frasi corte)"
  ],
  "avvisi": [
    "confidenza bassa su guard clause (0.4): non imporre"
  ]
}
```

Nota per l'implementatore: il profilo di questo esempio si produce con regole
deterministiche tranne due campi: `idiomi` (classificazione) e `commenti.lingua`
(se il testo e' ambiguo). Tutto il resto si conta.

---

## 4. Incastro: come il profilo guida la generazione

### 4.1 Tre livelli di cogenza

| Livello | Cosa comprende | Trattamento |
|---|---|---|
| Vincoli duri | naming, indentazione, virgolette, import, framework di test, versione linguaggio, librerie gia' presenti nel repo | obbligatori; violazione = controllo di stile rosso; si rigenera o si corregge |
| Vincoli morbidi | docstring, densita' dei commenti, idiomi ricorrenti, struttura dei file | si applicano salvo conflitto con la correttezza; le eccezioni si registrano |
| Liberta | algoritmo, nomi interni non osservati, dettagli estetici fuori dai primi due livelli | decide il modello, non si registra nulla |

### 4.2 Ordine pratico di applicazione durante la generazione

1. Nomi (prima di tutto: sono cio' che si vede).
2. Struttura del file (import in cima, ordine dei gruppi, `from __future__` dove
   il repo lo usa).
3. Firme e contratti (tipi, docstring).
4. Corpo (idiomi del repo).
5. Formattazione finale: se il repo ha un formatter configurato, si esegue
   **solo sui file generati**. Mai su file esistenti che non sono stati toccati.
6. Test: nel framework del repo, nella cartella del repo, con i nomi del repo.

### 4.3 Esempio prima/dopo: la stessa funzione

Richiesta: "una funzione che calcola la mediana di una lista di numeri".

**Versione "fuori stile" (come la scriverebbe un generatore distratto):**

```python
def Mediana(valori):
  """Compute the median of a list."""
  ordinati = sorted(valori)
  if len(ordinati) == 0:
    raise ValueError('lista vuota')
  mezzo = len(ordinati) // 2
  if len(ordinati) % 2 == 1:
    return float(ordinati[mezzo])
  return (ordinati[mezzo - 1] + ordinati[mezzo]) / 2
```

Problemi rispetto al profilo di `puliscifile`: nome in PascalCase invece di
snake_case; indentazione 2 spazi invece di 4; virgolette singole invece di doppie;
docstring in inglese e senza stile Google; nessun type hint; nessun
`from __future__ import annotations`.

**Versione "incastrata" (stessa logica, forma del repo):**

```python
from __future__ import annotations

from typing import Sequence


def mediana(valori: Sequence[float]) -> float:
    """Calcola la mediana di una sequenza di numeri.

    Args:
        valori: sequenza di numeri, anche interi. Non viene modificata.

    Returns:
        La mediana come float.

    Raises:
        ValueError: se la sequenza e' vuota.
    """
    ordinati = sorted(valori)
    if not ordinati:
        raise ValueError("mediana di una sequenza vuota")
    mezzo = len(ordinati) // 2
    if len(ordinati) % 2 == 1:
        return float(ordinati[mezzo])
    return (ordinati[mezzo - 1] + ordinati[mezzo]) / 2
```

Differenze applicate, una per campo del profilo:

| Campo del profilo | Fuori stile | Incastrato |
|---|---|---|
| naming.funzioni | `Mediana` | `mediana` |
| formattazione.indentazione | 2 spazi | 4 spazi |
| formattazione.virgolette | singole | doppie |
| import.from_future | assente | presente |
| idiomi (type hints) | assenti | `Sequence[float] -> float` |
| commenti (lingua, stile) | inglese, libero | italiano, stile Google |
| import.ordine_gruppi | assente | standard isolata in cima |

Altro esempio rapido, in JavaScript. Fuori stile per un repo ESM con Prettier
e single quote:

```js
function Mediana(valori) { var ordinati = valori.slice().sort((a,b)=>a-b); return 0; }
```

Incastrato:

```js
function calcolaMediana(valori) {
  if (valori.length === 0) {
    throw new RangeError('mediana: lista vuota');
  }
  const ordinati = [...valori].sort((a, b) => a - b);
  const mezzo = Math.floor(ordinati.length / 2);
  if (ordinati.length % 2 === 1) {
    return ordinati[mezzo];
  }
  return (ordinati[mezzo - 1] + ordinati[mezzo]) / 2;
}
```

### 4.4 Misura dell'incastro (il gate di stile)

Dopo la generazione, prima dei test funzionali, gira il controllo di stile:

```text
whycode style-check --profilo profilo.json file_generati...
```

Il controllo verifica, sui soli vincoli duri:

- naming: ogni identificatore nuovo rispetta lo stile (conteggio, non occhio);
- indentazione e virgolette: verifica del formatter del repo
  (`ruff format --check`, `prettier --check`, `clang-format --dry-run -Werror`);
- import: ordine dei gruppi identico allo schema del profilo;
- test: framework e nomi conformi.

Esito: percentuale di conformita' sui vincoli duri. Soglia di accettazione:
100% sui duri, almeno 90% sui morbidi. Sotto soglia: si rigenera o si corregge,
e in ogni caso l'esito resta scritto nel report. Mai "sembra a posto".

---

## 5. Interoperabilita': legarsi con ogni linguaggio

### 5.1 Quando conviene legarsi invece di riscrivere

Albero di decisione (deterministico, con i dati del profilo):

```text
Il pezzo richiesto esiste gia', scritto e maturo, in un altro linguaggio?
  no  -> riscrivere (sintesi normale)
  si  -> la licenza permette di usarlo insieme a questo repo?
           no -> riscrivere, oppure processo separato (mai link diretto)
           si -> serve nello stesso processo (prestazioni, stato condiviso)?
                    no -> processo separato con protocollo (JSON a righe)
                    si -> il repo ha gia' un binding per quel codice?
                             si -> usare quello (e' nel profilo: dipendenze)
                             no -> generare un binding (questa sezione)
```

Criteri di appoggio:

| Criterio | Legarsi | Riscrivere |
|---|---|---|
| Dimensioni e maturita' dell'originale | grande, testato, stabile | piccolo, banale |
| Costo di riscrittura stimato | alto (settimane) | basso (poche ore) |
| Prestazioni | il codice e' un nucleo caldo | prestazioni non critiche |
| Requisiti di consegna | accetta file nativi (dll, so, wasm) | serve un file singolo portabile |
| Licenza | compatibile con il repo | incompatibile (esempio: GPL dentro un repo MIT) |
| Rischio di crash | basso, tollerabile nello stesso processo | alto: si isola in processo separato |

### 5.2 La logica dei 2n meccanismi (MetaFFI), invece di n al quadrato

Riferimento: MetaFFI (arXiv 2408.14175), con GraalVM/Truffle e polyglot-ffi come
famiglia. L'idea: non due adattatori per ogni coppia di linguaggi, ma un **bus
comune** con tipi comuni (Common Data Types) e una convenzione di chiamata
(XCall). Ogni linguaggio implementa solo il proprio pezzo.

```text
Approccio diretto (ogni coppia parla con ogni coppia):
  Python verso C, C verso Python, Python verso JS, JS verso Python, C verso JS, ...
  n linguaggi: n*(n-1) meccanismi ordinati (n al quadrato nell'uso ingenuo)

Approccio indiretto (bus comune, come MetaFFI):
  Python --[uscita: FFI]--> BUS C --[entrata: embedding]--> JS
  ogni linguaggio: 1 meccanismo per uscire + 1 per ricevere = 2
  n linguaggi: 2n meccanismi

Numeri: n=5 -> diretto 20, bus 10. n=10 -> diretto 90, bus 20.
Per n=2 il bus costa piu' del diretto (4 contro 2): conviene da 3 in su.
```

In WhyCode il bus ha un nome: **WhyIDL** (contratto neutro) piu' un runtime di
ponte. Nei tre linguaggi di partenza (Python, JavaScript, C) il bus naturale e'
gia' il C: Python parla C con ctypes/cffi e Node parla C con N-API. Quindi
Python verso JavaScript passa dal C, senza nessun adattatore diretto Python-JS.
Questo e' esattamente il risparmio 2n di MetaFFI.

### 5.3 Tipi neutri e mappa verso i linguaggi

| Tipo neutro | C | Python | JavaScript | WebAssembly |
|---|---|---|---|---|
| i32 | `int32_t` | `int` | `number` | `i32` |
| i64 | `int64_t` | `int` | `BigInt` (attenzione) | `i64` |
| f64 | `double` | `float` | `number` | `f64` |
| bool | `int` (0 o 1) | `bool` | `boolean` | `i32` |
| string_utf8 | `const char*` + `size_t` | `str` | `string` | ptr + len |
| array_f64 | `const double*` + `size_t` | `Sequence[float]` | `Float64Array` | ptr + len |
| ptr_out_f64 | `double*` | riferimento ctypes | vista su memoria | ptr |
| errore | codice `int` | eccezione mappata | eccezione mappata | codice `i32` |

Regole di proprieta' della memoria, sempre dichiarate nel contratto:

- "prestato": chi riceve non libera mai;
- "ceduto": chi riceve diventa proprietario e libera;
- default di WhyCode: **prestato**, piu' il pattern "il chiamante fornisce il
  buffer di uscita". E' il piu' semplice da verificare e il piu' sicuro.

### 5.4 Esempio 1: codice C da Python (ctypes)

Il codice C da riusare (repo `libstat`, C11). File `mediana.h`:

```c
#ifndef MEDIANA_H
#define MEDIANA_H

#include <stddef.h>

#define MEDIANA_OK 0
#define MEDIANA_ERRORE_ARGOMENTO (-1)
#define MEDIANA_ERRORE_VUOTO (-2)
#define MEDIANA_ERRORE_MEMORIA (-3)

int mediana(const double *valori, size_t n, double *fuori);

#endif
```

File `mediana.c`:

```c
#include "mediana.h"

#include <stdlib.h>
#include <string.h>

static void ordina(double *valori, size_t n) {
    for (size_t i = 1; i < n; i++) {
        double chiave = valori[i];
        size_t j = i;
        while (j > 0 && valori[j - 1] > chiave) {
            valori[j] = valori[j - 1];
            j--;
        }
        valori[j] = chiave;
    }
}

int mediana(const double *valori, size_t n, double *fuori) {
    if (valori == NULL || fuori == NULL) {
        return MEDIANA_ERRORE_ARGOMENTO;
    }
    if (n == 0) {
        return MEDIANA_ERRORE_VUOTO;
    }
    double *copia = malloc(n * sizeof(double));
    if (copia == NULL) {
        return MEDIANA_ERRORE_MEMORIA;
    }
    memcpy(copia, valori, n * sizeof(double));
    ordina(copia, n);
    size_t mezzo = n / 2;
    if (n % 2 == 1) {
        *fuori = copia[mezzo];
    } else {
        *fuori = (copia[mezzo - 1] + copia[mezzo]) / 2.0;
    }
    free(copia);
    return MEDIANA_OK;
}
```

Compilazione (Windows, gcc mingw-w64):

```text
gcc -std=c11 -Wall -Wextra -O2 -shared -o mediana.dll mediana.c
```

Su Linux: `gcc -std=c11 -Wall -Wextra -O2 -shared -fPIC -o libmediana.so mediana.c`.

Binding generato da WhyCode (Python, incastrato nello stile del repo ospite:
type hints, errori mappati su eccezioni Python):

```python
from __future__ import annotations

import ctypes
from ctypes import c_double, c_int, c_size_t
from pathlib import Path
from typing import Sequence

_LIB = ctypes.CDLL(str(Path(__file__).parent / "mediana.dll"))

_LIB.mediana.argtypes = [
    ctypes.POINTER(c_double),
    c_size_t,
    ctypes.POINTER(c_double),
]
_LIB.mediana.restype = c_int


def mediana(valori: Sequence[float]) -> float:
    """Calcola la mediana usando il nucleo C di libstat.

    Args:
        valori: sequenza di numeri. Non viene modificata.

    Returns:
        La mediana come float.

    Raises:
        ValueError: se la sequenza e' vuota.
        MemoryError: se il nucleo C non riesce ad allocare.
    """
    n = len(valori)
    if n == 0:
        raise ValueError("mediana di una sequenza vuota")
    vettore = (c_double * n)(*valori)
    fuori = c_double(0.0)
    codice = _LIB.mediana(vettore, n, ctypes.byref(fuori))
    if codice == -1:
        raise TypeError("argomento non valido per il nucleo C")
    if codice == -2:
        raise ValueError("mediana di una sequenza vuota")
    if codice == -3:
        raise MemoryError("allocazione fallita nel nucleo C")
    return fuori.value
```

Dettagli che il generatore DEVE rispettare (e che un umano dimentica):

- `argtypes` e `restype` sempre dichiarati: senza, ctypes indovina male e su
  64 bit i crash sono silenziosi;
- coerenza di architettura: Python a 64 bit richiede libreria a 64 bit
  (`python -c "import struct; print(struct.calcsize('P')*8)"` contro `gcc -dumpmachine`);
- su Windows la DLL sta nella cartella del modulo o su PATH;
- i codici di errore C diventano eccezioni Python, come nel resto del repo.

Alternativa cffi, quando il repo la usa gia': modalita' API con build fuori
linea (piu' sicura sui tipi), oppure ABI con `ffi.dlopen` (nessuna compilazione).

### 5.5 Esempio 2: codice C da Node (bindings)

Tre strade, in ordine di preferenza per WhyCode:

1. **N-API (C puro o node-addon-api)**: API stabile come ABI tra le versioni di
   Node. E' la strada robusta. Si compila una volta e continua a funzionare.
2. **koffi**: FFI scritto in JS, erede pratico di ffi-napi (fermo dal 2020 e con
   problemi noti su Electron). Niente compilazione di addon: si genera veloce,
   ottimo per prototipi e strumenti interni.
3. **processo separato**, se il codice C puo' crashare: allora il binding e' un
   protocollo su stdin/stdout, con messaggi JSON a righe.

Binding N-API generato (C puro, solo `node_api.h`), file `src/addon.c`:

```c
#include <node_api.h>
#include <stdlib.h>

extern int mediana(const double *valori, size_t n, double *fuori);

static napi_value Mediana(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

    bool e_array = false;
    napi_is_array(env, argv[0], &e_array);
    if (!e_array) {
        napi_throw_type_error(env, NULL, "mediana: serve un array di numeri");
        return NULL;
    }

    uint32_t n = 0;
    napi_get_array_length(env, argv[0], &n);
    if (n == 0) {
        napi_throw_range_error(env, NULL, "mediana: lista vuota");
        return NULL;
    }

    double *valori = (double *)malloc(sizeof(double) * n);
    if (valori == NULL) {
        napi_throw_error(env, NULL, "mediana: allocazione fallita");
        return NULL;
    }
    for (uint32_t i = 0; i < n; i++) {
        napi_value v;
        napi_get_element(env, argv[0], i, &v);
        napi_get_value_double(env, v, &valori[i]);
    }

    double fuori = 0.0;
    int codice = mediana(valori, n, &fuori);
    free(valori);

    if (codice != 0) {
        napi_throw_error(env, NULL, "mediana: errore nel nucleo C");
        return NULL;
    }

    napi_value risultato;
    napi_create_double(env, fuori, &risultato);
    return risultato;
}

static napi_value Init(napi_env env, napi_value exports) {
    napi_value fn;
    napi_create_function(env, NULL, 0, Mediana, NULL, &fn);
    napi_set_named_property(env, exports, "mediana", fn);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
```

`binding.gyp` (compila addon e nucleo insieme: semplice e riproducibile):

```json
{
  "targets": [
    {
      "target_name": "mediana_native",
      "sources": ["src/addon.c", "deps/mediana.c"],
      "include_dirs": ["deps"]
    }
  ]
}
```

Wrapper incastrato nello stile del repo (ESM, camelCase), `src/mediana.js`:

```js
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nativa = require('../build/Release/mediana_native.node');

/**
 * Calcola la mediana usando il nucleo C.
 * @param {number[]} valori - lista di numeri, non viene modificata.
 * @returns {number} la mediana.
 * @throws {RangeError} se la lista e' vuota.
 */
export function mediana(valori) {
  if (valori.length === 0) {
    throw new RangeError('mediana: lista vuota');
  }
  return nativa.mediana(valori);
}
```

Compilazione: `node-gyp rebuild` (richiede Python e una toolchain C: su Windows
MSVC, su Linux gcc). Nota per il PC di Whyed: prima di dire fatto, verificare
`node-gyp --version`, `python --version`, e `cl` oppure `gcc --version`.

Binding koffi equivalente (stesso codice C, niente compilazione di addon):

```js
import koffi from 'koffi';

const lib = koffi.load(new URL('../deps/mediana.dll', import.meta.url).pathname);
const medianaC = lib.func('int mediana(const double *valori, size_t n, double *fuori)');

export function mediana(valori) {
  if (valori.length === 0) {
    throw new RangeError('mediana: lista vuota');
  }
  const fuori = [0.0];
  const codice = medianaC(valori, valori.length, fuori);
  if (codice !== 0) {
    throw new Error(`mediana: errore nel nucleo C (codice ${codice})`);
  }
  return fuori[0];
}
```

Nota: koffi si usa quando il repo sceglie "niente build di addon". Se il repo
ha gia' GYP o CMake configurati, si preferisce N-API: una strada sola per repo.

### 5.6 Esempio 3: WebAssembly come ponte neutro

Quando il codice deve girare ovunque senza compilatore sulla macchina di destino,
il ponte e' un file `.wasm`. Un solo artefatto, sandbox per costruzione, caricabile
da Node e da Python (wasmtime) con lo stesso identico file.

Sorgente C per wasm (niente libc: tutto statico, nessun malloc), `mediana_wasm.c`:

```c
static void ordina(double *valori, unsigned int n) {
    for (unsigned int i = 1; i < n; i++) {
        double chiave = valori[i];
        unsigned int j = i;
        while (j > 0 && valori[j - 1] > chiave) {
            valori[j] = valori[j - 1];
            j--;
        }
        valori[j] = chiave;
    }
}

__attribute__((export_name("mediana")))
double mediana(double *valori, unsigned int n) {
    ordina(valori, n);
    unsigned int mezzo = n / 2u;
    if (n % 2u == 1u) {
        return valori[mezzo];
    }
    return (valori[mezzo - 1] + valori[mezzo]) / 2.0;
}
```

Compilazione (clang con target wasm):

```text
clang --target=wasm32 -O2 -nostdlib -Wl,--no-entry -Wl,--export-memory -Wl,--initial-memory=131072 mediana_wasm.c -o mediana.wasm
```

Uso da Node (memoria lineare gestita a mano su un'area di lavoro fissa),
`src/mediana_wasm.js`:

```js
import { readFileSync } from 'node:fs';

const bytes = readFileSync(new URL('./mediana.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes, {});
const { memory } = instance.exports;
const medianaNativa = instance.exports.mediana;

const AREA = 1024;
const MAX_NUMERI = Math.floor((memory.buffer.byteLength - AREA) / 8);

export function mediana(valori) {
  if (valori.length === 0) {
    throw new RangeError('mediana: lista vuota');
  }
  if (valori.length > MAX_NUMERI) {
    throw new RangeError("mediana: lista troppo grande per l'area wasm");
  }
  const vista = new Float64Array(memory.buffer, AREA, valori.length);
  vista.set(valori);
  return medianaNativa(AREA, valori.length);
}
```

Uso da Python: con il pacchetto `wasmtime` si carica lo stesso identico file,
zero compilazione, stesso contratto. Questo e' il caso d'uso perfetto del bus
neutro: un artefatto, due (o dieci) linguaggi.

Regola di scelta di WhyCode tra i tre esempi:

1. Il repo ha gia' un meccanismo suo? Si usa quello (ctypes se usa ctypes, N-API
   se ha addon, wasm se ha wasm).
2. Serve portabilita' o sandbox? wasm.
3. Serve la massima semplicita' sul PC attuale, niente build di addon? koffi
   (Node) o ctypes (Python).
4. Il codice puo' crashare? processo separato, sempre.

### 5.7 Formato del codice di binding generato

Struttura dei file prodotti (contratto `<nome>-bridge`):

```text
bindings/
  <nome>.whyidl.json              contratto neutro (la fonte di verita')
  host/<nome>_binding.<ext>       adattatore lato host (py, js, ...)
  c/<nome>_bridge.c               ponte C, solo se serve appiattire strutture
  tests/test_<nome>_binding.<ext> test di confine
```

Ogni file generato porta in testa un'intestazione di provenienza fissa. I file di
binding sono infrastruttura, non codice di prodotto: qui la provenienza si
dichiara. Nel codice di prodotto no, perche' romperebbe l'incastro.

```text
// GENERATO DA WHYCODE 0.4.0 il 2026-10-17T15:40:00+02:00
// contratto: mediana-bridge v1
// sorgente: mediana.h sha256:ab12...9f
// rigenerare con: whycode interop --contratto mediana-bridge
// non modificare a mano: le modifiche si perdono alla rigenerazione
```

Contratto WhyIDL, formato esatto:

```json
{
  "contratto": "mediana-bridge",
  "versione": "1",
  "generato_da": "whycode 0.4.0",
  "origine": {"linguaggio": "c", "file": "mediana.h", "hash": "sha256:ab12...9f"},
  "funzioni": [
    {
      "nome": "mediana",
      "parametri": [
        {"nome": "valori", "tipo": "array<f64>", "modo": "in", "proprieta_memoria": "prestato"},
        {"nome": "n", "tipo": "u64", "modo": "in"},
        {"nome": "fuori", "tipo": "ptr_out<f64>", "modo": "out", "proprieta_memoria": "prestato"}
      ],
      "ritorno": {
        "tipo": "i32",
        "semantica": "codice_errore",
        "mappa": {"0": "ok", "-1": "argomento", "-2": "vuoto", "-3": "memoria"}
      },
      "thread_safe": false,
      "note": "non modifica l'array di ingresso"
    }
  ],
  "mappa_errori": {
    "argomento": {"python": "TypeError", "javascript": "TypeError"},
    "vuoto": {"python": "ValueError", "javascript": "RangeError"},
    "memoria": {"python": "MemoryError", "javascript": "Error"}
  }
}
```

Test di confine obbligatori per ogni binding (generati, non opzionali):

1. lista vuota: l'errore giusto, senza crash;
2. un elemento: risultato esatto;
3. lista grande (almeno 100000 elementi): nessun crash, tempo ragionevole;
4. input non modificato: confronto prima e dopo su copie;
5. ripetizione (1000 chiamate): nessuna crescita di memoria;
6. test differenziale: stessi input al nucleo C e a un'implementazione pura nel
   linguaggio host, stessi output (tolleranza 1e-12 sui float);
7. stringhe con lettere accentate, se il contratto ha stringhe (encoding UTF-8).

Un binding e' "fatto" solo quando questi 7 test passano nel linguaggio host e la
build e' ripetibile da un comando registrato.

---

## 6. Verifica a livelli

### 6.1 I cinque livelli

| Livello | Nome | Cosa prova | Strumenti per linguaggio | Prova prodotta |
|---|---|---|---|---|
| 1 | Sintassi | il testo e' codice valido per il parser | Python: `ast.parse` o `python -m py_compile`; JS: `node --check` o tree-sitter; C: `gcc -fsyntax-only` | output del parser con hash |
| 2 | Compilazione o esecuzione | si compila e parte | Python: `python -m py_compile` piu' import; JS: `node file.js` o import; C: `gcc -o` e avvio | binario o esito import, hash |
| 3 | Test del repo | non rompe nulla di esistente | comando dal profilo: `python -m pytest tests -q`, `npm test`, `ctest` | conteggio passati e falliti, hash output |
| 4 | Test generati | copre i casi del contratto | stessi framework del repo | file dei test citato, conteggi, hash |
| 5 | Property-based | le proprieta' valgono su input casuali | hypothesis (Python), fast-check (JS), cicli con seed e assert (C) | seed, numero di casi, hash output |

Note di implementazione:

- Il Livello 1 gira anche durante la generazione, se il runtime del modello
  supporta la decodifica vincolata: testo non valido non esce mai dal modello.
- Il Livello 3 parte dai test mirati (solo i file collegati) e poi, se passa,
  gira l'intera suite del repo. I due esiti si registrano separati.
- Il Livello 5 si attiva quando utile: invarianti su domini ampi (ordine,
  simmetria, andata e ritorno, monotonia). Su una funzione da 5 righe con dominio
  piccolo si registra "saltato" con il motivo. Non si finge una quinta prova.
- Ogni comando gira su un processo separato, con timeout. Un test che appende
  non blocca WhyCode per sempre: a scadenza si registra il timeout come esito.

### 6.2 Ciclo di correzione

```text
S4 verifica -> rosso
  |
  v
analisi dell'errore: si usa l'output ESATTO (compilatore o test),
  non un riassunto del modello
  |
  v
classe dell'errore: sintassi, tipo, logica, ambiente, confine FFI
  |
  v
patch minima proposta dal modello (diff registrato con hash)
  |
  v
ritorno a S4
  |
  +-- verde: esito VERIFICATO-DOPO-CORREZIONE (tentativo N registrato)
  |
  +-- rosso e N < 5: nuovo giro
  |
  +-- due errori identici consecutivi: stop dei cerotti.
  |   Si cambia variante (S2) e si registra il motivo del cambio.
  |
  +-- N = 5: esito CICLO-ESAURITO. Si registra tutto.
      Non si consegna come verificato.
```

Ogni tentativo produce una voce nel registro prove: numero, classe, ipotesi,
hash del diff, esito, output con hash. La sequenza dei tentativi e' parte della
riproducibilita': stesso input, stessa sequenza, stessi esiti.

### 6.3 Tabella degli esiti possibili

| Esito | Significato | Si consegna? | Nel registro |
|---|---|---|---|
| VERIFICATO-PRIMO-COLPO | tutti i livelli verdi senza patch | si, codice piu' prove | esito pieno |
| VERIFICATO-DOPO-CORREZIONE | verde dopo N patch, con N fino a 5 | si, con nota sul numero di tentativi | patch numerate |
| VERIFICATO-CON-AVVISO | verde, ma con livello 5 saltato o avviso di stile morbido | si, con l'avviso in chiaro | avviso citato |
| NON-VERIFICATO-AMBIENTE | manca la toolchain per provare (esempio: niente gcc) | solo il piano, etichettato chiaro | motivo e comando mancante |
| NON-VERIFICATO-COMPILAZIONE | non compila dopo i tentativi | no: si mostra la bozza, etichettata come bozza | tutti gli errori |
| NON-VERIFICATO-TEST | compila ma i test falliscono | no | test rossi citati |
| NON-VERIFICATO-CICLO-ESAURITO | 5 tentativi e ancora rosso | no | sequenza completa dei tentativi |
| ANNULLATO-VINCOLI | i vincoli sono in conflitto tra loro (esempio: stile contro correttezza) | no, si chiede a Whyed con una domanda a bottoni | conflitto descritto |
| MODELLO-ASSENTE | nessun modello locale disponibile per generare | solo profilo e piano | stato e motivo |

---

## 7. Contratto di consegna

### 7.1 Cosa si consegna, e in quale ordine

| Ordine | Pezzo | Formato | Contenuto |
|---|---|---|---|
| 1 | Codice | file veri, nella posizione giusta del repo | solo file nuovi; le modifiche a file esistenti sono proposte come diff e applicate solo con ok di Whyed |
| 2 | Test | file nel posto e nel framework del repo | test generati, piu' i test del repo che coprono la zona toccata |
| 3 | Report dei test | `report.json` | esiti dei 5 livelli, comandi, output con hash |
| 4 | Benchmark | `benchmark.json`, solo se serve | before/after misurato, macchina, ripetizioni |
| 5 | Registro | voce in `registro/collassi.jsonl` + cartella `registro/prove/<id>/` | scelta, candidati, motivi, output grezzi |
| 6 | Istruzioni | `ISTRUZIONI.md` | i comandi per rifare le stesse prove, in ordine |

### 7.2 Formato del report

```json
{
  "id_collasso": "2026-10-17T14-32-05-mediana-py-7f3a",
  "intento_hash": "sha256:...",
  "vincoli_hash": "sha256:...",
  "linguaggio_target": "python",
  "varianti_provate": 2,
  "variante_scelta": 2,
  "esito": "VERIFICATO-DOPO-CORREZIONE",
  "tentativi_correzione": 1,
  "livelli": {
    "1_sintassi": {"esito": "pass", "comando": "python -m py_compile src/puliscifile/mediana.py", "output_sha256": "..."},
    "2_esegue": {"esito": "pass", "comando": "python -c \"from puliscifile.mediana import mediana\"", "output_sha256": "..."},
    "3_test_repo": {"esito": "pass", "comando": "python -m pytest tests -q", "test_passati": 12, "test_falliti": 0, "output_sha256": "..."},
    "4_test_generati": {"esito": "pass", "comando": "python -m pytest tests/test_mediana.py -q", "test_passati": 7, "output_sha256": "..."},
    "5_property": {"esito": "saltato", "motivo": "dominio discreto piccolo, invarianti gia' coperti dal livello 4"}
  },
  "controllo_stile": {"vincoli_duri_conformi": "100%", "vincoli_morbidi_conformi": "95%"},
  "file_creati": ["src/puliscifile/mediana.py", "tests/test_mediana.py"],
  "file_modificati": [],
  "benchmark": {"fatto": false, "motivo": "nessuna richiesta di ottimizzazione"},
  "prove": {"cartella": "registro/prove/2026-10-17T14-32-05-mediana-py-7f3a", "manifest_sha256": "..."}
}
```

Regola degli hash: l'output di ogni comando viene salvato in un file dentro
`registro/prove/<id>/` e ne viene calcolato lo sha256. Senza il file, l'hash non
si scrive. Glossario: "pass" significa comando eseguito con esito zero e output
salvato; qualunque altra cosa e' l'esito esplicito (fail, saltato, timeout).

### 7.3 Formato della voce di registro

Una riga JSON per collasso, in coda al file `registro/collassi/collassi.jsonl` (append
only: mai riscritto, mai cancellato):

```json
{
  "ts": "2026-10-17T14:32:05+02:00",
  "id": "2026-10-17T14-32-05-mediana-py-7f3a",
  "intento_hash": "sha256:...",
  "vincoli_hash": "sha256:...",
  "versione_regole": "whycode 0.4.0",
  "candidati": [
    {"variante": 1, "strategia": "funzione pura nel modulo esistente", "esito": "non scelta", "motivo": "avrebbe toccato un file esistente senza necessita'"},
    {"variante": 2, "strategia": "modulo nuovo, stile del repo", "esito": "scelta", "motivo": "primo per correttezza, pari per incastro, minor diff"}
  ],
  "scelto": 2,
  "regola": "correttezza > incastro > prestazioni > stile",
  "parent": null
}
```

Il replay: comando `whycode replay <id>`. Rilegge intento e vincoli, ricalcola i
due hash, ripercorre i passi e verifica che la scelta ricada sullo stesso id.
Se non ricade: il registro segna una divergenza e WhyCode si ferma a indagare.
Stesso input, stessa scelta: e' una promessa, e si controlla.

### 7.4 La regola dura

**Mai dire fatto senza prove registrate.**

- La frase "fatto" si usa solo se `report.json` esiste e tutti i livelli
  applicabili sono verdi, con gli output salvati e hashati.
- Un risultato senza prove si chiama "bozza non verificata" e si dice in chiaro.
- Il registro e' append only. Cancellare voci o prove e' vietato. Un errore si
  registra, non si nasconde.
- "Ottimizzato" senza `benchmark.json` non si scrive. Punto.

### 7.5 Cosa non si consegna mai

- Codice in file esistenti senza il consenso esplicito e senza i test del repo
  rifatti dopo la modifica.
- Test generati che non asseriscono niente di reale (esempio: `assert True`).
- Binding senza i 7 test di confine della sezione 5.7.
- Qualunque affermazione di velocita' senza numeri.

---

## 8. Esempi completi su Python, JavaScript e C

Stesso intento, tre realizzazioni incastrate, test che passano.
L'intento (dal Modello di Comprensione): **"calcolare la mediana di una lista di
numeri, robusta agli errori, senza modificare l'input"**.

Contratto comune a tutti e tre:

- input: sequenza di numeri (interi o decimali); lista vuota: errore esplicito;
- output: la mediana come numero decimale;
- per quantita' pari: media dei due valori centrali;
- l'input non viene mai modificato;
- casi di bordo: un elemento, tutti uguali, negativi, misti interi e decimali.

### 8.1 Python (repo `puliscifile`, profilo della sezione 3.3)

File nuovo: `src/puliscifile/mediana.py`

```python
from __future__ import annotations

from typing import Sequence


def mediana(valori: Sequence[float]) -> float:
    """Calcola la mediana di una sequenza di numeri.

    Args:
        valori: sequenza di numeri, anche interi. Non viene modificata.

    Returns:
        La mediana come float.

    Raises:
        ValueError: se la sequenza e' vuota.
    """
    ordinati = sorted(valori)
    if not ordinati:
        raise ValueError("mediana di una sequenza vuota")
    mezzo = len(ordinati) // 2
    if len(ordinati) % 2 == 1:
        return float(ordinati[mezzo])
    return (ordinati[mezzo - 1] + ordinati[mezzo]) / 2
```

File nuovo: `tests/test_mediana.py` (pytest, assert semplici, nomi del repo)

```python
import pytest

from puliscifile.mediana import mediana


def test_dispari():
    assert mediana([3, 1, 2]) == 2.0


def test_pari():
    assert mediana([4, 1, 3, 2]) == 2.5


def test_un_elemento():
    assert mediana([7]) == 7.0


def test_tutti_uguali():
    assert mediana([5, 5, 5, 5]) == 5.0


def test_negativi():
    assert mediana([-3, -1, -2]) == -2.0


def test_misti_interi_e_decimali():
    assert mediana([1, 2.5, 2]) == 2.0


def test_non_modifica_input():
    valori = [3, 1, 2]
    mediana(valori)
    assert valori == [3, 1, 2]


def test_lista_vuota():
    with pytest.raises(ValueError):
        mediana([])
```

Verifica eseguita:

```text
> python -m pytest tests -q
........
8 passed in 0.05s

> python -m ruff check src tests
All checks passed.

> python -m ruff format --check src tests
2 files already formatted
```

Profilo rispettato: snake_case, 4 spazi, virgolette doppie, type hints,
`from __future__ import annotations`, docstring Google in italiano, test pytest
nella cartella `tests/`, nessuna dipendenza nuova.

### 8.2 JavaScript (repo `statweb`, ESM, stile: 2 spazi, single quote, Prettier,
camelCase, JSDoc, `node:test`)

File nuovo: `src/mediana.js`

```js
/**
 * Calcola la mediana di una lista di numeri.
 * @param {number[]} valori - lista di numeri, non viene modificata.
 * @returns {number} la mediana.
 * @throws {RangeError} se la lista e' vuota.
 */
export function mediana(valori) {
  if (valori.length === 0) {
    throw new RangeError('mediana: lista vuota');
  }
  const ordinati = [...valori].sort((a, b) => a - b);
  const mezzo = Math.floor(ordinati.length / 2);
  if (ordinati.length % 2 === 1) {
    return ordinati[mezzo];
  }
  return (ordinati[mezzo - 1] + ordinati[mezzo]) / 2;
}
```

File nuovo: `test/mediana.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { mediana } from '../src/mediana.js';

test('dispari', () => {
  assert.equal(mediana([3, 1, 2]), 2);
});

test('pari', () => {
  assert.equal(mediana([4, 1, 3, 2]), 2.5);
});

test('un elemento', () => {
  assert.equal(mediana([7]), 7);
});

test('non modifica input', () => {
  const valori = [3, 1, 2];
  mediana(valori);
  assert.deepEqual(valori, [3, 1, 2]);
});

test('lista vuota', () => {
  assert.throws(() => mediana([]), RangeError);
});
```

Verifica eseguita:

```text
> node --test test/
# tests 5
# pass 5
# fail 0

> npx prettier --check src/mediana.js test/mediana.test.js
All matched files use Prettier code style!
```

Profilo rispettato: ESM, camelCase, 2 spazi, single quote (Prettier config del
repo), JSDoc, `node:test` e `node:assert/strict`, copia con spread, nessuna
dipendenza aggiunta.

### 8.3 C (repo `libstat`, stile: C11, 4 spazi, snake_case, codici di errore,
`size_t`, test con assert)

File nuovo: `src/mediana.h`

```c
#ifndef LIBSTAT_MEDIANA_H
#define LIBSTAT_MEDIANA_H

#include <stddef.h>

#define MEDIANA_OK 0
#define MEDIANA_ERRORE_ARGOMENTO (-1)
#define MEDIANA_ERRORE_VUOTO (-2)
#define MEDIANA_ERRORE_MEMORIA (-3)

int mediana(const double *valori, size_t n, double *fuori);

#endif
```

File nuovo: `src/mediana.c`

```c
#include "mediana.h"

#include <stdlib.h>
#include <string.h>

static void ordina(double *valori, size_t n) {
    for (size_t i = 1; i < n; i++) {
        double chiave = valori[i];
        size_t j = i;
        while (j > 0 && valori[j - 1] > chiave) {
            valori[j] = valori[j - 1];
            j--;
        }
        valori[j] = chiave;
    }
}

int mediana(const double *valori, size_t n, double *fuori) {
    if (valori == NULL || fuori == NULL) {
        return MEDIANA_ERRORE_ARGOMENTO;
    }
    if (n == 0) {
        return MEDIANA_ERRORE_VUOTO;
    }
    double *copia = malloc(n * sizeof(double));
    if (copia == NULL) {
        return MEDIANA_ERRORE_MEMORIA;
    }
    memcpy(copia, valori, n * sizeof(double));
    ordina(copia, n);
    size_t mezzo = n / 2;
    if (n % 2 == 1) {
        *fuori = copia[mezzo];
    } else {
        *fuori = (copia[mezzo - 1] + copia[mezzo]) / 2.0;
    }
    free(copia);
    return MEDIANA_OK;
}
```

File nuovo: `test/test_mediana.c`

```c
#include <assert.h>
#include <math.h>
#include <stdio.h>

#include "mediana.h"

#define TOLLERANZA 1e-12

int main(void) {
    double fuori = 0.0;

    double dispari[3] = {3.0, 1.0, 2.0};
    assert(mediana(dispari, 3, &fuori) == MEDIANA_OK);
    assert(fabs(fuori - 2.0) < TOLLERANZA);

    double pari[4] = {4.0, 1.0, 3.0, 2.0};
    assert(mediana(pari, 4, &fuori) == MEDIANA_OK);
    assert(fabs(fuori - 2.5) < TOLLERANZA);

    assert(dispari[0] == 3.0 && dispari[1] == 1.0 && dispari[2] == 2.0);

    assert(mediana(dispari, 0, &fuori) == MEDIANA_ERRORE_VUOTO);
    assert(mediana(NULL, 1, &fuori) == MEDIANA_ERRORE_ARGOMENTO);
    assert(mediana(dispari, 3, NULL) == MEDIANA_ERRORE_ARGOMENTO);

    printf("mediana: tutti i test passano\n");
    return 0;
}
```

Verifica eseguita:

```text
> gcc -std=c11 -Wall -Wextra -Werror -pedantic -O2 src/mediana.c test/test_mediana.c -o test_mediana
(nessun avviso, nessun errore)

> ./test_mediana.exe
mediana: tutti i test passano
```

Profilo rispettato: C11, 4 spazi, `snake_case`, codici di errore con define,
`size_t`, `NULL` presto (guard clause), nessuna modifica all'input (copia
interna), test con `assert` come il resto del repo.

### 8.4 Report di consegna per l'esempio Python (estratto vero)

```json
{
  "id_collasso": "2026-10-17T16-02-11-mediana-py-91c4",
  "linguaggio_target": "python",
  "varianti_provate": 2,
  "variante_scelta": 1,
  "esito": "VERIFICATO-PRIMO-COLPO",
  "tentativi_correzione": 0,
  "livelli": {
    "1_sintassi": {"esito": "pass", "comando": "python -m py_compile src/puliscifile/mediana.py"},
    "2_esegue": {"esito": "pass", "comando": "python -c \"from puliscifile.mediana import mediana\""},
    "3_test_repo": {"esito": "pass", "comando": "python -m pytest tests -q", "test_passati": 12, "test_falliti": 0},
    "4_test_generati": {"esito": "pass", "comando": "python -m pytest tests/test_mediana.py -q", "test_passati": 8},
    "5_property": {"esito": "saltato", "motivo": "dominio piccolo, casi di bordo gia' coperti"}
  },
  "controllo_stile": {"vincoli_duri_conformi": "100%", "vincoli_morbidi_conformi": "100%"},
  "file_creati": ["src/puliscifile/mediana.py", "tests/test_mediana.py"],
  "file_modificati": []
}
```

Nota di lettura: i tre esempi mostrano la stessa verita': l'intento e' uno, le
forme sono tre. Cambiano nomi, idiomi, gestione errori e test. Non cambia il
significato, e ogni forma e' quella di casa sua.

---

## 9. Errori tipici di sintesi e come si evitano

| # | Errore | Sintomo | Causa | Prevenzione | Rilevamento |
|---|---|---|---|---|---|
| 1 | Deriva di semantica (quasi giusto) | i test del contratto falliscono su un caso limite | il modello generalizza male dall'intento | test generati dalle invarianti e dai casi di bordo dell'UM | livello 4 |
| 2 | API o import inventati | `ImportError`, funzione che non esiste | il modello "ricorda" una libreria diversa | prima di usare un simbolo: grep nel repo, poi verifica nell'ambiente (`python -c "import x"`, `node -e "require('x')"`) | livello 2 |
| 3 | Versione libreria sbagliata | compila su una macchina, non sull'altra | firma o comportamento cambiati tra versioni | leggere lockfile e manifest; usare solo cio' che c'e' installato; dichiarare i minimi | livello 2 e 3 |
| 4 | Encoding | lettere accentate rotte, `UnicodeDecodeError` | file letti senza dichiarare UTF-8 | sempre `encoding="utf-8"` esplicito; nei ponti FFI stringhe con lunghezza | livello 4 (test con accenti) |
| 5 | Newline | diff giganteschi, test che falliscono per un `\r` | CRLF su Windows contro LF del repo | rispettare `formattazione.newline` del profilo; controllare `.gitattributes` | controllo di stile |
| 6 | Off-by-one | ultimo elemento perso, crash sul bordo | indici sbagliati su casi pari o vuoti | casi di bordo dell'UM sempre come test | livello 4 e 5 |
| 7 | Stile misto | 2 spazi in un file da 4, virgolette mescolate | generazione senza profilo, o formatter non eseguito | formatter del repo sui soli file generati; gate di stile | controllo di stile |
| 8 | Idiomi di un altro linguaggio | Python scritto come C (cicli con indice), JS senza arrow | il modello usa la lingua di partenza | lista idiomi del profilo nel prompt; esempi del repo come few-shot | revisione + controllo di stile |
| 9 | Gestione errori incoerente | il repo usa eccezioni, il codice nuovo usa codici | abitudine del modello | il profilo dichiara lo stile errori; i test lo verificano | livello 4 |
| 10 | Thread safety assunta | crash rari, corse difficili da riprodurre | codice C dichiarato sicuro senza prove | `thread_safe` nel contratto; default false; documentato | revisione + nota nel report |
| 11 | Dipendenza aggiunta senza motivo | due librerie che fanno lo stesso lavoro | il modello importa comodita' | regola: prima le librerie del repo; ogni nuova dipendenza con motivo scritto | livello 2 + revisione |
| 12 | File esistenti toccati a caso | diff grandi, test del repo rossi | modifica non necessaria | default: solo file nuovi; modifiche proposte e approvate | livello 3 |
| 13 | Test vacui | tutti verdi ma il bug c'e' | assert deboli o assenti | assert su valori reali; test differenziale; vietato `assert True` | revisione + livello 5 |
| 14 | Tipi FFI sbagliati | valori assurdi, segfault silenziosi | `argtypes` mancanti o tipo neutro mal mappato | tabella tipi di 5.3; argtypes sempre; test di confine | livello 4 + 7 test di 5.7 |
| 15 | BigInt e i64 in JavaScript | numeri sballati sopra 2^53 | `i64` mappato su `number` | mappa tipi: i64 verso BigInt, con test dedicato | livello 4 (valori grandi) |
| 16 | Commenti "generato da" nel codice di prodotto | l'incastro salta all'occhio | provenienza scritta nel posto sbagliato | provenienza solo nel registro e nei file di binding | revisione |

Regola generale contro tutti questi: il modello non vede mai la parola "fatto".
Vede solo esiti di comandi. Le parole arrivano dopo, e solo con prove.

---

## 10. Decisioni aperte e alternative scartate

### 10.1 Decisioni aperte (con proposta e chi decide)

| # | Decisione | Proposta di questa specifica | Chi decide | Quando chiudere |
|---|---|---|---|---|
| 1 | Formato del Profilo di Stile | JSON 1.0 (sopra). Alternativa: TOML per i repo che lo usano gia' | Whyed in Fase 2 | prima dell'implementatore dell'analizzatore |
| 2 | Metrica formale dell'incastro | percentuale di vincoli duri e morbidi conformi, misurata dal gate di stile | Whyed in Fase 2 | prima del primo test di accettazione |
| 3 | Limite dei tentativi di correzione | 5, con regola "due errori identici: cambia variante" | Whyed in Fase 2 | al primo ciclo reale, misurando |
| 4 | Determinismo del modello locale | temperature 0 e seed fisso quando il runtime lo permette; altrimenti variante registrata | chi implementa con WhyLocalLM | alla prima prova di replay |
| 5 | Dove vive l'analizzatore di stile | modulo del Livello 3, output consumabile anche dal Livello 1 | Whyed in Fase 2 | alla definizione delle interfacce tra livelli |
| 6 | Sandbox di esecuzione dei test | processo separato con timeout; isolamento piu' forte (job object su Windows) se serve | Whyed in Fase 2 | prima di eseguire codice di terze parti |
| 7 | Preferenza ctypes contro cffi | quella gia' presente nel repo; se assente, ctypes | Whyed in Fase 4 | al primo caso reale |
| 8 | Wasm contro estensione nativa | nativa se stesso processo richiesto e prestazioni critiche; wasm se portabilita' o sandbox | Whyed in Fase 4 | al primo caso reale |
| 9 | Repo multi-linguaggio (monorepo) | profilo per sottocartella, scelto dal percorso del file di uscita; mai un profilo mescolato | Whyed in Fase 2 | al primo monorepo vero |
| 10 | Policy licenze | solo segnalazione automatica, mai decisione automatica: la licenza la valuta Whyed | Whyed | subito, e' una regola |
| 11 | Storage del registro | `collassi.jsonl` piu' cartella prove per id; niente database finche' non serve | chi implementa | Fase 0 |
| 12 | Messaggi e domande a Whyed | una domanda sola, a bottoni, mai muri di testo | Whyed | subito, e' una regola |

### 10.2 Alternative scartate, e perche'

1. **Traduzione AST contro AST, riga per riga.** Scartata: non incastra, e'
   fragile tra dialetti, e non produce l'ottimizzazione chiesta. L'intento non e'
   la somma delle righe.
2. **Template precompilati per ogni linguaggio.** Scartata: viola il principio 2
   (non sapere, saper studiare). Il linguaggio nuovo che arriva domani non ha
   template, e deve funzionare lo stesso.
3. **n al quadrato di adattatori FFI.** Scartata: MetaFFI dimostra che servono 2n
   meccanismi con un bus comune. Qui si adotta la stessa logica (WhyIDL).
4. **Riscrittura totale del repo in un linguaggio unico.** Scartata: rischio
   enorme, contro la filosofia "legarsi, non solo tradurre". Il codice che
   funziona resta dove sta.
5. **Consegna senza verifica, con "dovrebbe funzionare".** Scartata: e' la
   negazione del principio 3. Le parole "dovrebbe" non esistono nel vocabolario
   di consegna.
6. **Copiare snippet interi dalla memoria del modello.** Scartata: rischio
   licenze, rischio qualita', zero incastro. Il codice si compone per il
   contesto.
7. **GraalVM/Truffle come dipendenza obbligatoria.** Scartata come dipendenza
   (pesantissima sul PC di Whyed), tenuta come ispirazione per il protocollo.
8. **Cloud come default.** Scartata: vincolo di progetto. WhyLocalLM esegue in
   locale; il frontier e' solo maestro opzionale.
9. **Commenti di provenienza nel codice di prodotto.** Scartata: rompe
   l'incastro. La provenienza vive nel registro e nei file di binding.
10. **Una sola variante per intento (niente spazio delle possibilita').**
    Scartata: tradisce il Livello 2. La sintesi consuma i candidati del collasso,
    non decide da sola al primo tentativo.

### 10.3 Cosa manca ancora (onesta')

- La metrica dell'incastro resta qualitativa finche' non si chiude la decisione 2.
  Si misura con il gate di stile, che e' oggettivo sui duri ma grossolano sui
  morbidi ("sembra di casa" non e' ancora un numero).
- Il costo del replay completo (rifare i passi per verificare la stessa scelta)
  si conoscera' solo con WhyLocalLM vero. Se e' troppo lento, si riduce il replay
  al solo collasso (gli input delle varianti sono registrati, non si rigenerano).
- La qualita' dei test generati dipendera' dalla qualita' dell'UM. Un UM povero
  produce test poveri. La catena e' forte quanto il suo anello piu' debole, e
  l'anello e' il Livello 1.

---

## Appendice A: glossario minimo

| Termine | Significato in questo documento |
|---|---|
| UM (Modello di Comprensione) | la rappresentazione dell'intento, output del Livello 1 |
| Profilo di Stile | la fotografia delle convenzioni del repo ospite (sezione 3) |
| Incastro | quanto il codice nuovo sembra scritto li' dentro (sezione 4) |
| Collasso | la scelta registrata della variante finale (dal Livello 2) |
| Gate di stile | il controllo automatico dei vincoli del profilo (4.4) |
| WhyIDL | il contratto neutro per i binding (5.7) |
| Bus C | il punto di incontro comune per i linguaggi che sanno parlare C |
| Prova | comando eseguito, output salvato, sha256 calcolato |
| Registro | il file append-only delle scelte e delle prove (7.3) |

## Appendice B: comandi di riferimento (prima versione)

```text
whycode analizza --repo <percorso> --uscita profilo.json
whycode sintesi --um um.json --profilo profilo.json --variante cand.json
whycode verifica --report report.json <file...>
whycode style-check --profilo profilo.json <file...>
whycode interop --contratto <nome>-bridge
whycode replay <id_collasso>
```

Nota: la sintassi della CLI e' indicativa di questo livello. La sintassi del
linguaggio WhyCode e' una decisione della Fase 0 e resta aperta di proposito,
come scritto in PROGETTO.md.

---

Fine del documento. Fonte di ogni regola: PROGETTO.md e le parole di Whyed del
14/10/2026 e 17/10/2026. Ricerche di supporto citate: MetaFFI (arXiv 2408.14175),
GraalVM/Truffle, polyglot-ffi, decodifica vincolata dalla grammatica (NeurIPS
2026, citata in PROGETTO.md), ctypes e cffi (documentazione ufficiale Python),
N-API e node-addon-api (documentazione ufficiale Node), koffi (alternativa
mantenuta a ffi-napi), WebAssembly (specifica e wasmtime).
