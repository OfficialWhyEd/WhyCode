# SPEC-03: Spazio quantico (Livello 2 di WhyCode)

Stato: bozza completa del 17/10/2026.
Prerequisito: PROGETTO.md (visione approvata).
Documenti collegati: SPEC-02 (comprensione, Livello 1), SPEC-04 (sintesi e incrosto, genera le varianti), SPEC-05 (ottimizzazione, misura), SPEC-07 (motore WhyLocalLM), PIANO-IMPLEMENTAZIONE.md, registro dei collassi (stessa disciplina del registro di WhyObliter).

Frase guida di Whyed (14/10/2026), riportata dal PROGETTO.md:

> "una specie di codice quantico che lavora in reverse engineering al momento per trovare sempre la composizione giusta e continua di qualsiasi codice in maniera deterministica ma appunto quantistica"

Frase guida di Whyed (17/10/2026):

> "inventarne uno che si incastri... la risposta ha un'ottimizzazione di codice notevole"

Questo documento definisce il Livello 2: lo **spazio delle realizzazioni possibili** e il **collasso deterministico registrato**.
Scopo dichiarato: un altro agente deve poter implementare lo spazio quantico partendo solo da questo documento.

Regola di lettura: italiano semplice, frasi corte. Gli accenti sono resi con l'apostrofo, come nel PROGETTO.md (esempio: "e'", "perche'", "qualita'"). Niente trattini lunghi, niente emoji.

---

## 0. Scopo, confini, interfacce

### 0.1 Scopo

WhyCode tratta un programma non come una cosa sola, ma come uno **spazio di realizzazioni possibili**.
Quando serve il codice finale, avviene un **collasso**: una scelta deterministica, registrata, riproducibile.
Stesso input, stessa scelta, sempre.

Questo documento copre:

1. Le definizioni formali (intento, spazio, variante, vincolo, potenziale, collasso) con esempi.
2. Il contratto di generazione delle varianti (N varianti per intento, seed, temperatura, diversita', budget).
3. Il sistema dei vincoli, con le sette categorie complete.
4. Il collasso deterministico: funzione pura, ordine dei criteri, regole di pareggio, casi di fallimento.
5. Il registro dei collassi: formato JSON riga per riga con catena di hash anti-manomissione.
6. Replay e verifica: come si riproduce un collasso a distanza di tempo, con test di determinismo.
7. La spiegazione rigorosa del "quantistico" e del "deterministico", con i limiti dell'analogia.
8. Costi e controllo dello spazio: esplosione combinatoria, campionamento, budget, degradazione con grazia.

### 0.2 Non scopo

- Il Livello 1 (comprensione, inferenza delle grammatiche) e' SPEC-02. Qui il Modello di Comprensione entra gia' pronto, con il suo hash.
- La sintesi vera e propria del codice nelle varianti e' SPEC-04. Qui si definisce il contratto con cui le varianti nascono, non l'algoritmo di generazione.
- L'ottimizzazione misurata e' SPEC-05. Qui si usano le sue misure come input del collasso.
- Il motore AI (WhyLocalLM) e' SPEC-07. Qui si dice solo cosa il motore deve garantire (seed, parametri registrati, localita' di default).

### 0.3 Interfacce

    SPEC-02 (Livello 1)
      Modello di Comprensione (JSON canonico, con hash)
            |
            v
    +------------------------------------------------------+
    |  SPEC-03: Livello 2, spazio quantico                 |
    |                                                      |
    |  INTENTO + VINCOLI + CONTESTO                        |
    |            |                                         |
    |            v                                         |
    |  GENERAZIONE (SPEC-04) --> N varianti -----------+   |
    |                                                  |   |
    |  GATE VINCOLI --> varianti ammesse               |   |
    |            |                                     |   |
    |  TEST + BENCH (SPEC-05) --> schede tecniche -----+   |
    |            |                                         |
    |            v                                         |
    |  COLLASSO K (funzione pura) --> scelta finale        |
    |            |                                         |
    |            v                                         |
    |  REGISTRO (JSONL, catena di hash)                    |
    +------------------------------------------------------+
            |
            v
    Codice finale: a SPEC-05 per l'ottimizzazione, poi al repo ospite

Punti di contatto formali:

| Da | A | Cosa passa | Formato |
|---|---|---|---|
| SPEC-02 | SPEC-03 | Modello di Comprensione | JSON canonico, hash SHA-256 |
| Utente o livello superiore | SPEC-03 | Intento, vincoli | JSON canonico |
| SPEC-03 | SPEC-04 | Richiesta di generazione (intento, assi, seed) | JSON + record di generazione |
| SPEC-04 | SPEC-03 | Varianti con metadati | file nel magazzino + scheda |
| SPEC-05 | SPEC-03 | Esiti test, tempi, memorie | scheda tecnica |
| SPEC-03 | Registro | Evento di collasso | riga JSONL |
| SPEC-03 | Tutti | Scelta finale e motivo | riga di registro + esito |

### 0.4 Convenzioni

- **Forma canonica**: JSON con chiavi ordinate per code point crescente, separatori ":" e ",", nessuno spazio, numeri interi (mai float), testo ASCII, null ammesso. La forma canonica di un oggetto si scrive `forma_canonica(x)`.
- **Hash**: SHA-256, esadecimale minuscolo, 64 caratteri. `hash(x) = sha256(forma_canonica(x))`.
- **ID**: `INT-NNNN` per gli intenti, `CLP-AAAAMMGG-NNNN` per gli eventi di collasso (contatore giornaliero).
- **JSONL**: un evento per riga, riga = JSON compatto in forma canonica. Il registro e' append-only.
- **Punteggi**: interi da 0 a 10000, quantizzati a passi di 50 (vedi 4.3).
- **Tempi**: millisecondi. **Dimensioni**: byte UTF-8. **Memoria**: kilobyte.
- **Percorsi predefiniti** (proposta per la Fase 0):
  - Registro: `E:\Dev\WhyCode\registro\collassi\collassi.jsonl`
  - Magazzino varianti: `E:\Dev\WhyCode\magazzino\varianti\<hash_codice>.py` e `.json`
  - Modelli di comprensione: `E:\Dev\WhyCode\magazzino\mc\<mc_hash>.json`
  - Contesti: `E:\Dev\WhyCode\magazzino\contesti\<contesto_hash>.json`
  - Cache punteggi stimati: `E:\Dev\WhyCode\magazzino\punteggi\<chiave>.json`
- **Versione delle regole**: stringa semantica, esempio `rules-1.0.0`. Cambia ogni volta che cambia una regola di questo documento. Il collasso dipende dalla versione.
- **Localita'**: tutto gira in locale con WhyLocalLM di default. Il modello frontier ("maestro") e' spento di default (privacy) e si attiva solo su richiesta esplicita (vedi 10.2).

---

## 1. Definizioni formali

Ogni definizione e' breve e precisa. Ogni definizione ha un esempio.

### D1. Intento

**Definizione.** Un intento `I` e' la descrizione dichiarativa di cosa deve fare il codice, senza dire come.
Formalmente: `I = (id, nome, obiettivo, ingressi, uscite, effetti, invarianti, casi_bordo)`, dove ogni campo e' testo o elenco di testi.

**Esempio.** `I = (INT-0007, conta_colonne_csv, "leggi un file CSV e conta per ogni colonna quante righe hanno un valore non vuoto", ["percorso: testo"], ["conteggi: mappa colonna verso intero"], ["legge un file", "scrive su stdout"], ["il file non viene modificato", "l'ordine delle colonne e' conservato"], ["file vuoto", "campi vuoti", "virgole tra virgolette", "BOM"])`.

### D2. Spazio delle realizzazioni

**Definizione.** Lo spazio delle realizzazioni di un intento `I` in un linguaggio `L` sotto un contesto `X` e' l'insieme:

    S(I, L, X) = { r : r e' un programma valido in L, r realizza I, r rispetta X }

E' infinito in teoria (il testo puo' variare all'infinito). In pratica si usa un'approssimazione finita, `S_N`, con N varianti generate (sezione 2).

**Esempio.** Per INT-0007 in Python sotto il profilo stile a3: fa parte di S il programma con `csv.reader`, ne fa parte quello con pandas (finche' un vincolo non lo esclude), NON fa parte il programma che riscrive il file di input (viola l'invariante).

### D3. Variante

**Definizione.** Una variante `v` e' un elemento concreto dello spazio: `v = (id, codice, linguaggio, strategia, dipendenze, hash_codice)`.
La strategia e' un'etichetta breve (esempio: `stdlib-csv-loop`) che dice per quale idea e' stata generata. `hash_codice` e' `hash(codice)` con normalizzazione LF.

**Esempio.** `v = (V01, "<codice Python>", python, stdlib-csv-loop, [], d4f6d86a...bbdf)`, dimensione 667 byte.

### D4. Vincolo

**Definizione.** Un vincolo `c` e' un predicato sulle varianti: `c(v) -> vero | falso`. Ha due severita':
- **dura**: se `c(v) = falso`, `v` esce dallo spazio (gate).
- **morbida**: se `c(v) = falso`, `v` resta ma perde punti nella voce "incastro" (o "stile") del potenziale.
Formalmente: `c = (id, categoria, espressione, severita, origine, prova)` (sezione 3).

**Esempio.** `(VIN-2, dipendenze, "dipendenze_esterne == 0", dura, umano, "elenco import della variante")`: una variante che importa pandas viene esclusa subito, prima dei test.

### D5. Potenziale

**Definizione.** Il potenziale di una variante `v` e' il vettore dei quattro criteri, in ordine fisso:

    P(v) = (correttezza, incastro, prestazioni, stile)   con ogni voce intera in [0, 10000]

La correttezza e le prestazioni sono **misurate** (test e benchmark). L'incastro e lo stile sono **stimati** da regole piu' modello, in modo deterministico e con cache (vedi 4.3). Due varianti si confrontano con l'ordine lessicografico sui quattro criteri (sezione 4).

**Esempio.** `P(V01) = (10000, 8700, 9400, 8600)` e `P(V02) = (10000, 8400, 10000, 8800)`. V01 batte V02 perche' l'incastro (8700 contro 8400) viene prima delle prestazioni.

### D6. Collasso

**Definizione.** Il collasso `K` e' la funzione pura che, dati l'hash del Modello di Comprensione, i vincoli, il contesto, la versione delle regole, il seed e le schede delle varianti, produce:

    K(h_MC, h_V, h_X, R, s, schede) = (scelta, classifica, motivo, h_riga)

Proprieta' richieste: deterministica (stesso input, stesso output, sempre), pura (niente rete, niente orologio, niente stato nascosto), registrata (ogni esecuzione scrive una riga nel registro).

**Esempio.** Dati gli input di INT-0007 del 17/10/2026 alle 15:42, K produce `scelta = V01` con motivo "incastro 8700 contro 8400". Rilanciato oggi, produce di nuovo V01 e la stessa classifica.

### D7. Contesto

**Definizione.** Il contesto `X` e' la fotografia dell'ambiente in cui il collasso avviene: linguaggio target, versione della toolchain, profilo di stile del repo ospite, sistema operativo, motore disponibile, **capacita'** (classe di risorse, vedi D8). Si serializza in forma canonica e si riduce a `h_X`.

**Esempio.** `X = {capacita: media, grammatica: tree-sitter-python-0.21, profilo_stile: a3, sistema: windows-11, toolchain: {python: 3.12.4}, wlm: whylocallm-8b-q4}`, e `h_X = 8741aec0...aaf083`.

### D8. Capacita'

**Definizione.** La capacita' e' la classe di risorse disponibili al momento del collasso: `piena`, `media`, `bassa`, `minima` (sezione 8.5). **Fa parte del contesto**, quindi entra nel suo hash. Due collassi a capacita' diverse sono input diversi: registrati come eventi diversi, confrontabili con il diff.

**Esempio.** Lo stesso intento collassato in modalita' `media` (7 varianti) e in modalita' `bassa` (3 varianti) produce due righe di registro diverse. Non e' un bug: e' un input diverso.

### D9. Scheda tecnica

**Definizione.** La scheda tecnica di una variante e' il suo fascicolo misurato: compila, test passati su totali, import esterni, dimensione, annidamento massimo, tempo mediano, memoria di picco, punteggi. E' l'input di fatto del collasso. Si salva nel magazzino e si riusa per il replay.

**Esempio.** Scheda di V01: compila vero, test 5/5, import esterni 0, dimensione 667, tempo 412 ms, punteggi `(10000, 8700, 9400, 8600)`.

### D10. Evento di registro

**Definizione.** Un evento di registro e' la fotografia completa di un collasso (o di una riparazione, o di un fallimento): input, seed, varianti con esiti, scelta, motivo, stato. Si scrive come una riga JSONL e si incatena con la precedente (sezione 5).

**Esempio.** La riga `CLP-20261017-0001` della sezione 5.4 con `stato = collassato` e `scelta = V01`.

---

## 2. Generazione delle varianti

### 2.1 Chi genera

Il Livello 2 non genera codice: **definisce il contratto**. La generazione appartiene al compositore (SPEC-04) con il motore WhyLocalLM (SPEC-07).
Il contratto dice: quante varianti, come seedarle, come garantirne la diversita', cosa registrare.
Regola dura: **una variante che non e' registrata (codice nel magazzino, hash, parametri di generazione, seed) non esiste** per il collasso.

### 2.2 Assi di diversita'

Per lo stesso intento, la diversita' si cerca su assi fissi. Non e' casualita': e' copertura.

| Asse | Esempi per l'intento "conta colonne CSV" |
|---|---|
| Strategia algoritmica | csv della stdlib, split manuale, ciclo a due passate, una passata |
| Struttura dati | dict, Counter, lista di tuple |
| Libreria | solo stdlib, pandas, polars |
| Gestione dei bordi | stretta (fallisce presto), tollerante (salta le righe rotte) |
| Stile | imperativo, funzionale |
| Forma del codice | una funzione, piu' funzioni, classe |

Regola: ogni variante porta l'etichetta dell'asse **strategia**. La copertura minima e' `max(2, ceil(N / 3))` strategie distinte.

### 2.3 Campionamento con seed fisso

Il seed di generazione non e' casuale: e' **derivato**, come tutto in questo livello.

    seed            = primi 16 caratteri esadecimali di
                      sha256("whycode/seed/v1|" + h_MC + "|" + h_V + "|" + h_X + "|" + R)
    seed_gen(i)     = primi 16 caratteri esadecimali di
                      sha256("whycode/gen/v1|" + seed + "|" + i)

Il seed generale viene dal calcolo sugli input (e poi si rilegge dal registro, vedi 4.2). Il seed della variante i si deriva dal seed generale con un contatore.
Cosa serve a ottenere: varianti diverse tra loro, ma **sempre le stesse** a parita' di input. Il seed decorrela, non introduce liberta'.

Limite dichiarato: la stessa coppia (modello, seed, parametri) riproduce la stessa sequenza di token **solo a parita' di build del motore e di hardware**. Le varianti generate si salvano quindi nel magazzino (indirizzate da hash): il collasso non dipende dalla rigenerazione, dipende dal magazzino. La rigenerazione e' un controllo in piu', non la fonte di verita'.

### 2.4 Temperatura

| Uso | Temperatura | Nota |
|---|---|---|
| Esplorazione (prime varianti, idee diverse) | 0.8 - 1.0 | piu' sorpresa, piu' scarto |
| Bilanciata (riempimento, default) | 0.5 - 0.7 | compromesso |
| Conservativa (riparazioni, vicinato di una buona variante) | 0.1 - 0.3 | resta attaccata all'originale |

Parametri di campionamento fissi e registrati: `top_p = 0.95`, `max_tokens` per classe (vedi tabella 2.6). Ogni variante registra temperatura e parametri usati.
Regola: mai temperatura 0 per tutto (le varianti diventerebbero la stessa cosa), mai temperatura sopra 1.1 (il codice smette di compilare e si spreca budget).

### 2.5 Diversita' forzata e deduplicazione

1. **Deduplicazione esatta**: se una variante ha lo stesso `hash_codice` di una gia' generata, si scarta e si continua.
2. **Deduplicazione vicina**: si confronta la similarita' Jaccard tra i multiset di token (o di nodi AST con tree-sitter). Se `similarita' > 0.85`, la variante e' "troppo simile": si rigenera quel posto con temperatura +0.1.
3. **Tentativi**: massimo 3 rigenerazioni per posto. Se dopo 3 tentativi resta troppo simile, si accetta ma si marca `diversita_forzata: false` nella scheda, cosi' il registro dice la verita'.
4. **Copertura**: a fine generazione si controlla che il numero di strategie distinte sia almeno `max(2, ceil(N / 3))`. Se no, il posto mancante si rigenera puntando all'asse scoperto (prompt con divieto esplicito delle strategie gia' presenti).

### 2.6 Budget di varianti per contesto (quando 3, quando 30)

| Classe di contesto | N varianti | Tempo target | Bench | Note |
|---|---|---|---|---|
| Frammento usa e getta (fino a 30 righe attese) | 3 | 60 s | no | solo test |
| Script personale | 5 | 3 min | opzionale | default leggero |
| Codice dentro repo ospite | 7 | 5 min | le migliori 2 | default vero |
| Libreria condivisa o pubblica | 15 | 30 min (sessione notturna) | obbligatorio | test piu' severi |
| Nucleo critico (dati, soldi, sicurezza) | 30 | 60 min (notturna) | obbligatorio | riparazione estesa |

Regola rapida, parole semplici:

- **Genera 3** quando: hai fretta, le risorse sono basse, l'intento e' piccolo, la memoria ha gia' una risposta simile, oppure sei in un ciclo di riparazione.
- **Genera 30** quando: il codice e' critico, c'e' tempo (notte), i benchmark sono pronti, un errore costerebbe caro, o il linguaggio target e' nuovo (serve piu' esplorazione).

La classe di contesto fa parte di `X` (contesto): e' registrata e incide sul collasso, come la capacita'.

### 2.7 Cosa si registra della generazione

Per ogni variante, nel file metadati accanto al codice (`.json` nel magazzino):

| Campo | Valore |
|---|---|
| id | V01, V02, ... |
| strategia | etichetta dell'asse |
| seed_variante | 16 esadecimali |
| temperatura | numero con due decimali, mai float nel registro (stringa o intero per mille) |
| parametri | top_p, max_tokens |
| motore | nome e versione di WhyLocalLM |
| diversita_forzata | vero o falso (vedi 2.5) |
| hash_codice | SHA-256 del codice normalizzato LF |

Nel registro dei collassi si riporta il riassunto (id, strategia, hash_codice, dimensione); i dettagli stanno nel magazzino. Regola: il registro resta leggero, il magazzino tiene tutto.

---

## 3. Vincoli

### 3.1 Formato di un vincolo

Un vincolo e' JSON in forma canonica con sei campi:

    {
      "id": "VIN-2",
      "categoria": "dipendenze",
      "espressione": "dipendenze_esterne == 0",
      "severita": "dura",
      "origine": "umano",
      "prova": "elenco import della variante"
    }

| Campo | Significato |
|---|---|
| id | identificatore stabile nel tempo (VIN-N) |
| categoria | una delle sette della tabella 3.2 |
| espressione | predicato su primitive del valutatore (3.4), testo semplice, valutato in modo deterministico |
| severita | `dura` (gate) o `morbida` (penalita' nel potenziale) |
| origine | `umano`, `repo`, `inferito` (dal contesto dal Livello 1) |
| prova | come si verifica: quale fatto o quale misura si guarda |

L'insieme dei vincoli si serializza in forma canonica e si riduce a `h_V` (hash dei vincoli). L'ordine dell'elenco fa parte della forma: due elenchi con ordine diverso sono due vincoli diversi. Regola: si normalizza in ordine di id prima di hasare.

### 3.2 Le sette categorie

| Categoria | Cosa vincola | Esempio | Tipo tipico | Effetto sullo spazio |
|---|---|---|---|---|
| tipo | tipi e contratti | "niente Any", "ritorna dict[str, int]" | dura o morbida | dura: esclude le varianti che non rispettano la firma; morbida: toglie punti a incastro |
| memoria | limiti di tempo e memoria | "picco <= 128 MB", "O(n) massimo" | dura | esclude chi sfora la misura |
| piattaforma | SO, architettura, runtime | "Windows, Python 3.12" | dura | esclude import e chiamate non disponibili li' |
| stile del repo ospite | nomi, formato, idiomi locali | "profilo a3" | morbida | non esclude: abbassa il punteggio di incastro |
| sicurezza | divieti e allowlist | "no eval e no exec", "solo secrets per i token" | dura | esclude con scansione AST, prima dei test |
| versione linguaggio | sintassi e feature | "python >= 3.11" | dura | esclude chi usa feature non presenti nella versione |
| dipendenze | set ammesso di librerie | "dipendenze_esterne == 0" | dura | esclude chi importa fuori dal set |

### 3.3 Come ogni categoria filtra lo spazio, passo per passo

Il filtro e' una pipeline, in quest'ordine:

1. **Vincoli duri sulle dipendenze e sulla sicurezza**: si estraggono gli import e le chiamate rischiose da ogni variante (scansione AST). Fuori chi non passa. Costo: millisecondi, nessun test eseguito.
2. **Vincoli duri su versione e piattaforma**: si legge dalla variante la versione minima richiesta e i costrutti usati. Fuori chi non passa.
3. **Vincoli duri su tipo**: confronto firma contro contratto. Fuori chi non passa.
4. **Test e benchmark**: la correttezza e le prestazioni sono fatti misurati (sezione 4). Qui cadono i vincoli morali "non negoziabili" di fatto: fail-closed, vedi 4.7.
5. **Vincoli morbidi (stile, tipo morbido)**: non escludono niente. Entrano nel punteggio di incastro con i pesi del profilo (sezione 9.8).

Ogni esclusione si annota nella scheda: `esito = scartata_vincolo` e il motivo con l'id del vincolo che l'ha esclusa. Mai esclusioni silenziose.

### 3.4 Valutatore deterministico

Le espressioni dei vincoli si valutano con **primitive fisse**, non con un modello:

| Primitiva | Cosa restituisce | Usata da |
|---|---|---|
| import_esterni(v) | elenco import fuori stdlib | dipendenze |
| versione_minima(v) | versione minima del linguaggio richiesta | versione linguaggio |
| piattaforme(v) | piattaforme dichiarate o dedotte | piattaforma |
| usa_tipi(v) | copertura dei tipi (si o no, con percentuale intera) | tipo, stile |
| chiamate_rischiose(v) | eval, exec, os.system, subprocess non filtrati | sicurezza |
| memoria_picco_kb(v) | picco misurato in esecuzione | memoria |
| tempo_ms(v) | mediana di 3 esecuzioni | prestazioni, memoria |
| max_annidamento(v) | profondita' massima dei blocchi | stile |

Queste primitive sono estratte con tree-sitter e con l'esecuzione controllata. Sono funzioni pure della variante e del contesto: stesso input, stesso valore. Niente modello in questa fase: il modello stima solo incastro e stile (4.3).

### 3.5 Conflitti e spazio vuoto

- **Prima del filtro**: un controllo statico segnala coppie di vincoli duri che non possono valere insieme (esempio: "python >= 3.11" e "deve girare su interprete 3.8"). Il collasso si rifiuta di partire e restituisce il conflitto con i due id. Mai partizionare a meta'.
- **Dopo il filtro**: se lo spazio ammesso si svuota (0 varianti ammesse dai vincoli), si registra un evento con `stato = fallito` e motivo `nessuna_variante_ammessa`, con l'elenco delle esclusioni. Poi valgono le azioni della sezione 4.7.

---

## 4. Il collasso deterministico

Questa e' la sezione centrale del documento. Qui vive la promessa di Whyed: "in maniera deterministica ma appunto quantistica".

### 4.1 I tre stadi e la purezza

Il lavoro si divide in tre stadi, separati di proposito:

| Stadio | Nome | Puro? | Cosa fa | Dove finisce |
|---|---|---|---|---|
| 1 | Generazione | no (usa il modello) | produce le varianti | magazzino, con seed e parametri |
| 2 | Misura | no (usa l'esecuzione) | test, benchmark, stime di incastro e stile | schede tecniche, con numeri |
| 3 | Collasso K | **si'** | legge le schede e sceglie | riga di registro |

Il collasso (stadio 3) e' una funzione pura: non genera, non misura, non chiama rete, non guarda l'orologio, non usa numeri casuali non derivati, non legge variabili globali mutabili.
Tutte le impurita' stanno negli stadi 1 e 2, e **ogni impurita' viene registrata** (seed, motore, misure). Per questo l'esito e' riproducibile pezzo per pezzo.

### 4.2 Firma e input esatti

    K(h_MC, h_V, h_X, R, s, schede) -> (scelta, classifica, motivo, h_riga)

| Input | Cosa e' | Esempio (INT-0007) |
|---|---|---|
| h_MC | SHA-256 della forma canonica del Modello di Comprensione | 70e8715e37c712fb689b9c52e4187398461dc72a9b4830d6fc284bbf112cbe53 |
| h_V | SHA-256 della forma canonica dell'elenco vincoli (id in ordine) | 068411c206f2f5eb1cf6131f45e7105af3ebee7516647d19ae4fe83ffae1b63b |
| h_X | SHA-256 della forma canonica del contesto (capacita' inclusa) | 8741aec0d883dd4535d3c29030b4940001c85279bbe17020f72aea3193aaf083 |
| R | versione delle regole | rules-1.0.0 |
| s | seed, derivato e poi riletto dal registro | 15082737c28bbf5b |
| schede | schede tecniche delle varianti (misurate e stimate) | vedi sezione 9 |

Il seed si deriva cosi' (formula completa in Appendice A):

    s = primi 16 hex di sha256("whycode/seed/v1|" + h_MC + "|" + h_V + "|" + h_X + "|" + R)

Il registro lo contiene, quindi il replay lo **rilegge dal registro** invece di ricalcolarlo: se i due valori non coincidono, e' un allarme (input manomessi) e il collasso si ferma.
Nella prima versione della macchina a stati, il collasso si esegue **dopo** la misura e non tocca le varianti: cambia solo il suo input (le schede), mai il suo codice.

Purezza, in pratica: niente `random`, niente `datetime.now()` dentro K, niente ordinamenti instabili (la lista varianti si ordina per id prima di classificare), tutta aritmetica intera.

### 4.3 Punteggi e quantizzazione

Regola dura: **niente float nei punteggi**. I float non sono riproducibili bit a bit tra macchine e compilatori diversi. Si usa un intero 0..10000, quantizzato:

    quantizza(x) = min(10000, massimo(0, 50 * arrotonda_meta_su(x / 50)))

- **correttezza** = quantizza(10000 * test_passati / test_totali). Esempi: 5/5 -> 10000; 3/4 -> 7500; 2/5 -> 4000; 1/3 -> 3350 (3333,3 si arrotonda a 3350); 0/3 -> 0.
- **prestazioni** = quantizza(10000 * t_min / t_variante), con t_min = tempo mediano migliore tra le varianti ammesse al bench. Esempio: t_min 388 ms, variante 412 ms -> 9417,5 -> 9400.
- **incastro**: stimato dalle regole del profilo di stile piu' modello, con cache su chiave `(hash_codice, profilo, R)`. Gia' quantizzato dai pesi. Esempio: 87/100 -> 8700.
- **stile**: stimato dallo stesso meccanismo, con le regole interne di WhyCode (annidamento, lunghezza funzioni, densita' dei commenti). Esempio: 86/100 -> 8600.

Le stime (incastro, stile) sono dichiarate stime. Nella scheda ogni punteggio porta la sua origine: `misurato` oppure `stimato`.

Bench e rumore: 3 esecuzioni, mediana, risoluzione 1 ms. La quantizzazione a 50 punti assorbe il rumore normale. Regola di scarto stretto (4.8) per i casi limite.

### 4.4 Ordine dei criteri

L'ordine e' fissato dal PROGETTO.md ed e' lessicografico:

1. **correttezza**
2. **incastro**
3. **prestazioni**
4. **stile**

Formalmente, per due varianti `v` e `w` ammesse:

    v meglio di w  se e solo se:
      correttezza(v) > correttezza(w)
      oppure (correttezza uguale e incastro(v) > incastro(w))
      oppure (correttezza e incastro uguali e prestazioni(v) > prestazioni(w))
      oppure (i primi tre uguali e stile(v) > stile(w))

La correttezza non si negozia: una variante che non compila o non passa i test non entra mai nella classifica delle ammesse. "Piu' veloce ma sbagliato" non esiste.
Nota didattica: le prestazioni arrivano **dopo** l'incastro. Nel caso di INT-0007 la variante piu' veloce (V02, 388 ms) perde contro la piu' incastrata (V01, 412 ms). E' voluto: il primo criterio dopo la correttezza e' "sembrare scritto li' dentro".

### 4.5 Regole di pareggio (tie-breaking)

Se due varianti sono pari su tutti e quattro i criteri, si applica questa catena, in quest'ordine, fermandosi alla prima differenza:

| Ordine | Regola | Perche' |
|---|---|---|
| T1 | meno dipendenze esterne vince | meno superficie di rottura |
| T2 | codice piu' piccolo in byte UTF-8 vince | meno da leggere e mantenere |
| T3 | strategia con piu' successi storici in memoria vince | premia cio' che ha gia' funzionato qui |
| T4 | id minore in ordine lessicografico vince ("V01" < "V19") | garanzia di ordine totale |

Con T4 l'ordine e' **totale**: non esistono pareggi irrisolti. La catena e' tutta deterministica e tutta registrata nel motivo.
Nota per l'implementazione: la classifica si calcola su una copia della lista varianti ordinata per id. Cosi' l'ordine di arrivo delle varianti non cambia mai l'esito.

T3 legge un numero dalla memoria (SPEC-06): `successi_strategia(strategia, profilo)`. Se la strategia non e' mai stata vista, il valore e' 0. Anche questo numero fa parte del contesto? No: si legge dalla memoria e si cita nel motivo; la memoria e' indirizzata da h_X dentro il contesto, quindi cambiando repo cambia h_X e cambia tutto in modo coerente.

### 4.6 Esempi numerati

**Esempio 4.6.1, la correttezza decide.**
Varianti A e B ammesse. `P(A) = (10000, 5000, 5000, 5000)`, `P(B) = (8000, 9900, 9900, 9900)`.
Confronto: correttezza 10000 > 8000. Vince A. I criteri successivi non si guardano nemmeno.

**Esempio 4.6.2, l'incastro decide.**
`P(A) = (10000, 8700, 9400, 8600)`, `P(B) = (10000, 8400, 10000, 8800)`.
Correttezza pari. Incastro 8700 > 8400. Vince A. B e' piu' veloce e piu' "bello" internamente, ma l'incastro viene prima delle prestazioni e dello stile. Questo e' il caso reale di INT-0007 (sezione 9).

**Esempio 4.6.3, la catena di pareggio.**
`P(A) = (9000, 8000, 9000, 9000)`, `P(B) = (9000, 8000, 9000, 9000)`: pari su tutto.
T1: A ha 2 dipendenze esterne, B ne ha 0. Vince B.
Se anche T1 fosse pari: T2: A 700 byte, B 650 byte. Vince B.
Se anche T2 fosse pari: T3: strategia di A con 12 successi storici, di B con 7. Vince A.
Se anche T3 fosse pari: T4: id A "V04", id B "V19". Vince A ("V04" < "V19").
Fine: sempre un vincitore, sempre lo stesso.

### 4.7 Cosa succede se nessuna variante passa i test

Politica: **fail-closed**. Una variante e' ammessa solo se passa tutti i test (100%). Nessun "quasi". Le azioni sono una scala, in ordine:

1. **Scarto dei non compilanti**: chi non compila non entra nemmeno nei test. Annotato con `esito = scartata_compilazione`.
2. **Riparazione**: si prendono le 2 migliori per frazione di test passati e si generano fino a 5 varianti di riparazione per ciclo, con temperatura bassa (0.1 - 0.3) e la diagnosi dei test falliti nel prompt. Massimo 3 cicli. Ogni variante riparata porta `ciclo_riparazione: n`.
3. **Maestro (opzionale, spento di default)**: se attivato esplicitamente, si chiede aiuto a un modello frontier. Privacy prima di tutto: in locale di default, nessun dato esce dal PC. Se il maestro e' disponibile, le sue varianti entrano nello stesso filtro e negli stessi test. Nessuno sconto.
4. **Fallimento onesto**: se anche la riparazione si esaurisce, si registra l'evento con `stato = fallito`, `scelta = null`, motivo con la diagnosi unita e un `consiglio` operativo (esempio: "fornire fixture reali", "allentare VIN-2", "chiarire il caso bordo T5"). Il chiamante riceve l'errore e il report. **Mai consegnare codice non provato.**

L'esempio 3 della sezione 5.4 e' proprio un fallimento onesto, registrato per intero.

### 4.8 Scarto stretto e override umano

- **Scarto stretto**: se il criterio decisivo vince per meno di 100 punti, il motivo porta `scarto_stretto: true`. Non cambia la scelta (il collasso resta deterministico), ma segnala all'occhio umano che una misura al rumore poteva girare. Il diff e l'audit evidenziano questi eventi.
- **Override umano**: se Whyed vuole un'altra variante, non si riscrive la riga. Si appende un **nuovo** evento con `stato = collassato`, `override_umano: true` e `motivo.criterio = "umano"`, che referenzia l'id precedente nel campo `sostituisce`. La storia resta tutta, in ordine. Il registro non si modifica mai: si allunga.

---

## 5. Registro dei collassi

### 5.1 File e formato

- File: `E:\Dev\WhyCode\registro\collassi\collassi.jsonl`. Una riga per evento, append-only.
- Ogni riga e' un JSON compatto in forma canonica (chiavi ordinate, separatori ":" e ",", niente spazi).
- Un evento per: collasso riuscito, riparazione, fallimento, riuso, override umano.
- La riga di registro e' pensata per essere leggibile da un essere umano con un `Get-Content` e da una macchina con `ConvertFrom-Json` o `json.loads`.

### 5.2 Campi

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| schema | stringa | si | versione dello schema: "whycode.collasso/1" |
| id | stringa | si | CLP-AAAAMMGG-NNNN, contatore giornaliero |
| ts | stringa | si | UTC ISO 8601, esempio "2026-10-17T15:42:07Z" |
| inputs.mc_hash | stringa | si | hash del Modello di Comprensione |
| inputs.vincoli_hash | stringa | si | hash dei vincoli |
| inputs.contesto_hash | stringa | si | hash del contesto (capacita' inclusa) |
| inputs.regole_versione | stringa | si | versione delle regole |
| inputs.intento_id | stringa | si | riferimento all'intento |
| seed | stringa | si | 16 esadecimali, derivato e poi riletto da qui |
| capacita | stringa | si | piena, media, bassa, minima |
| varianti | lista | si | una voce per variante, vedi sotto |
| scelta | stringa o null | si | id della variante scelta, null se fallito |
| motivo | oggetto | si | criterio decisivo e dettaglio |
| stato | stringa | si | collassato, riparato, fallito, riusato |
| catena.prev_hash | stringa | si | riga_hash dell'evento precedente (64 zeri per il primo) |
| riga_hash | stringa | si | SHA-256 di (prev_hash + riga senza riga_hash) |
| sostituisce | stringa | no | id dell'evento sostituito (override umano) |
| override_umano | booleano | no | presente solo negli override |

Voce dell'elenco `varianti`:

| Campo | Tipo | Descrizione |
|---|---|---|
| id | stringa | V01, V02, ... |
| strategia | stringa | etichetta dell'asse di diversita' |
| hash_codice | stringa | SHA-256 del codice (normalizzazione LF) |
| dimensione | intero | byte UTF-8 |
| dipendenze | intero | numero di dipendenze esterne |
| esito | stringa | ammessa, scartata_vincolo, scartata_compilazione, scartata_test |
| test | oggetto | esito, passati, totali |
| punteggi | oggetto | correttezza, incastro, prestazioni, stile (interi o null) |
| ciclo_riparazione | intero | presente solo per le riparate (1, 2, 3) |

### 5.3 Forma canonica e catena di hash

La catena si costruisce cosi':

    h_riga(0) = "0000...0000"          (64 zeri)
    h_riga(n) = sha256( h_riga(n-1) + forma_canonica(evento_n senza il campo riga_hash) )

Cosi' ogni riga lega la precedente. Chi modifica una riga rompe la catena da quel punto in avanti: il controllo e' immediato e non richiede segreti.
Cosa NON e': non e' una difesa contro chi riscrive **tutta** la catena e ne ricalcola gli hash. Lo dice l'onesta' della sezione 5.6.

### 5.4 Esempio completo di 3 righe di registro

Riga 1: collasso riuscito (INT-0007, conta colonne CSV, capacita' media).

    {"capacita":"media","catena":{"prev_hash":"0000000000000000000000000000000000000000000000000000000000000000"},"id":"CLP-20261017-0001","inputs":{"contesto_hash":"8741aec0d883dd4535d3c29030b4940001c85279bbe17020f72aea3193aaf083","intento_id":"INT-0007","mc_hash":"70e8715e37c712fb689b9c52e4187398461dc72a9b4830d6fc284bbf112cbe53","regole_versione":"rules-1.0.0","vincoli_hash":"068411c206f2f5eb1cf6131f45e7105af3ebee7516647d19ae4fe83ffae1b63b"},"motivo":{"criterio":"incastro","dettaglio":"correttezza pari 5/5; incastro 8700 contro 8400, scarto 300 punti"},"riga_hash":"03ca4e48ea3a56a60108fe4ae6075e33c4ed2a7a15d66452a0e195aface32898","scelta":"V01","schema":"whycode.collasso/1","seed":"15082737c28bbf5b","stato":"collassato","ts":"2026-10-17T15:42:07Z","varianti":[{"dipendenze":0,"dimensione":667,"esito":"ammessa","hash_codice":"d4f6d86ab195105bc4d517d28cf9cbc464ee12f890788866918a5f30c6f1bbdf","id":"V01","punteggi":{"correttezza":10000,"incastro":8700,"prestazioni":9400,"stile":8600},"strategia":"stdlib-csv-loop","test":{"esito":"ok","passati":5,"totali":5}},{"dipendenze":0,"dimensione":613,"esito":"ammessa","hash_codice":"2d4357ff280704be4a2dbd76c543b84d0c4678ea4b4d2fd245bde930e7accdeb","id":"V02","punteggi":{"correttezza":10000,"incastro":8400,"prestazioni":10000,"stile":8800},"strategia":"stdlib-counter-funzionale","test":{"esito":"ok","passati":5,"totali":5}},{"dipendenze":0,"dimensione":612,"esito":"scartata_test","hash_codice":"a1e0e49714bdfcd2c4d5a4c65165f7616d6130b66c1c096d22ac981798f7f959","id":"V03","punteggi":{"correttezza":4000,"incastro":null,"prestazioni":null,"stile":null},"strategia":"split-manuale","test":{"esito":"fallito","passati":2,"totali":5}}]}

Riga 2: riparazione (INT-0009, token esadecimale, capacita' bassa). La prima variante falliva un test di sicurezza; la riparazione in un ciclo passa 4/4.

    {"capacita":"bassa","catena":{"prev_hash":"03ca4e48ea3a56a60108fe4ae6075e33c4ed2a7a15d66452a0e195aface32898"},"id":"CLP-20261017-0002","inputs":{"contesto_hash":"481e88aa9b6d95141d1223a4490d422d6935153c691657c50ba99cc0eb764b14","intento_id":"INT-0009","mc_hash":"e713d402e77cb611b1a069212e51334a548384ca6de569a69ae19eacca605b60","regole_versione":"rules-1.0.0","vincoli_hash":"b62608732c01689a431aadc667a786706c57993c8aefa00e4a2f5aebdbdf5bc5"},"motivo":{"criterio":"riparazione","dettaglio":"V01 falliva un caso: riparazione ciclo 1, V01r passa 4/4"},"riga_hash":"8a3e65d05f789162e136659d7aeff60f6f7375ddf30e91e3ba4eeea4aa6f4bd0","scelta":"V01r","schema":"whycode.collasso/1","seed":"fe06fece57ce5ed5","stato":"riparato","ts":"2026-10-17T16:05:33Z","varianti":[{"dipendenze":0,"dimensione":214,"esito":"scartata_test","hash_codice":"a1d6228d0f97fb4f441ea76d9a0380c15a5803c374b89160c3968112e058a6fe","id":"V01","punteggi":{"correttezza":7500,"incastro":null,"prestazioni":null,"stile":null},"strategia":"uuid4","test":{"esito":"fallito","passati":3,"totali":4}},{"ciclo_riparazione":1,"dipendenze":0,"dimensione":226,"esito":"ammessa","hash_codice":"afc749749be1de31b3e91881ae11b4bafaee3a090f2c22ad29f07cedba7d425b","id":"V01r","punteggi":{"correttezza":10000,"incastro":8900,"prestazioni":9800,"stile":9000},"strategia":"secrets-token","test":{"esito":"ok","passati":4,"totali":4}}]}

Riga 3: fallimento onesto (INT-0012, unione di fogli Excel, capacita' media). Vincolo duro: zero dipendenze esterne. Nessuna variante ammessa, riparazione esaurita, maestro non chiamato (solo locale).

    {"capacita":"media","catena":{"prev_hash":"8a3e65d05f789162e136659d7aeff60f6f7375ddf30e91e3ba4eeea4aa6f4bd0"},"id":"CLP-20261017-0003","inputs":{"contesto_hash":"8741aec0d883dd4535d3c29030b4940001c85279bbe17020f72aea3193aaf083","intento_id":"INT-0012","mc_hash":"ddab802a67d45ab1b8f9425af67eabdde6ea0ca020ee6d974a58dfe9e6a02068","regole_versione":"rules-1.0.0","vincoli_hash":"e3631f2eb3216a9831a7d8ba7818571d98847789b2e0174f2abbccb7ab69f8f6"},"motivo":{"consiglio":"fornire fixture reali o allentare VIN-2","criterio":"nessuno","dettaglio":"3 varianti generate, 0 ammesse; 2 cicli di riparazione esauriti; maestro non chiamato (solo locale)"},"riga_hash":"b4f3c9b79b9ba3b7f2fe6917841545ec585399569a62693e463ef6f66ceb0181","scelta":null,"schema":"whycode.collasso/1","seed":"3b14a664898c786d","stato":"fallito","ts":"2026-10-17T16:31:52Z","varianti":[{"dipendenze":1,"dimensione":301,"esito":"scartata_vincolo","hash_codice":"ed01f24444b1f4637d0a0a80dca4ea6f49247bf1c819112f89bbaf3d78b94741","id":"V01","punteggi":{"correttezza":null,"incastro":null,"prestazioni":null,"stile":null},"strategia":"openpyxl","test":{"esito":"non_eseguito","passati":0,"totali":3}},{"dipendenze":0,"dimensione":845,"esito":"scartata_test","hash_codice":"cbb9e671fbab29b266177e46a4d62053d8aa057d3f038e9d8c2fb39ea34cb146","id":"V02","punteggi":{"correttezza":3350,"incastro":null,"prestazioni":null,"stile":null},"strategia":"zipfile-xml-manuale","test":{"esito":"fallito","passati":1,"totali":3}},{"dipendenze":0,"dimensione":612,"esito":"scartata_test","hash_codice":"f2dd603d1968cedd3fad2867d1fa7899eeaa7f0da6de2b016d246895f04aef19","id":"V03","punteggi":{"correttezza":0,"incastro":null,"prestazioni":null,"stile":null},"strategia":"zipfile-xml-pandas","test":{"esito":"fallito","passati":0,"totali":3}}]}

Le tre righe sono incatenate: la riga 2 contiene l'hash della riga 1 come prev_hash, la riga 3 quello della riga 2.
Gli hash di riga sono veri: sono stati calcolati con la formula della sezione 5.3 su queste stesse stringhe. Il controllo si puo' rifare a mano, vedi 5.5.
Le righe 2 e 3 sono esempi illustrativi: i loro input (approfondimenti di INT-0009 e INT-0012) non sono mostrati per intero, ma la catena e' coerente e verificabile a partire dalla riga 1.

### 5.5 Verifica a mano della catena

Snippet Python da incollare (solo libreria standard):

    import hashlib, json
    prev = "0" * 64
    for riga in open(r"E:\Dev\WhyCode\registro\collassi.jsonl", encoding="utf-8"):
        riga = riga.rstrip("\n")
        evento = json.loads(riga)
        atteso = evento.pop("riga_hash")
        canonica = json.dumps(evento, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        reale = hashlib.sha256((prev + canonica).encode("utf-8")).hexdigest()
        print(evento["id"], "OK" if reale == atteso else "DIVERGENTE")
        prev = atteso

Output atteso sulle tre righe di esempio:

    CLP-20261017-0001 OK
    CLP-20261017-0002 OK
    CLP-20261017-0003 OK

Sulle righe stampate in questo documento vale la stessa formula: riga meno il campo `riga_hash`, preceduta da 64 zeri per la prima riga, poi la catena.

### 5.6 Limiti della catena (onesta')

- La catena rileva la **manomissione parziale**: chi cambia una riga senza ricalcolare gli hash a valle viene scoperto subito.
- La catena **non impedisce** a chi riscrive tutto il registro di ricalcolare tutto: per quello servirebbe una firma esterna della testa della catena (decisione aperta 10.2, punto 1).
- La catena **non da' identita'** (chi ha scritto): e' integrita', non autenticazione. Per un sistema personale locale e' il livello giusto.
- Il registro e' **append-only per contratto**: nessuno strumento di WhyCode riscrive righe esistenti. Il tool `audit` verifica che la promessa sia stata mantenuta.

---

## 6. Replay e verifica

### 6.1 Cosa si puo' riprodurre, con precisione

| Cosa | Riproducibile? | Come |
|---|---|---|
| La scelta del collasso | **Si', esatta** | K e' pura: stessi input, stessa uscita, per sempre |
| La classifica e il motivo | **Si', esatta** | derivano da K sugli stessi punteggi |
| Il seed | **Si', esatto** | riletto dal registro, oppure ricalcolato dalla formula |
| Le misure (test, tempi) | Si', con le stesse condizioni | i test sono deterministici; i tempi si rileggono dal registro per il replay |
| Il testo delle varianti | Si', dal magazzino | indirizzate da hash; il collasso non rigenera mai per decidere |
| Rigenerare da zero le stesse varianti | **No, dichiarato** | dipende da build e hardware del motore (vedi 2.3) |

La regola d'oro: **il registro e il magazzino sono la fonte di verita'**. Il replay non chiede al modello di rifare il lavoro: rilegge e ricalcola.

### 6.2 Gli strumenti (nome, comando, cosa stampano)

Tool immaginati ma descritti con precisione. Prefisso: `whycode`.

**`whycode replay <id>`**: riproduce un collasso.
Legge la riga, ricostruisce gli input dal magazzino (forma canonica di MC, vincoli, contesto), rilegge il seed dal registro (o lo ricalcola: se non coincide, si ferma con allarme), ripete K sulle schede registrate, confronta.

    $ whycode replay CLP-20261017-0001
    id:                     CLP-20261017-0001
    input ricostruiti:      OK (mc, vincoli, contesto, regole)
    seed dal registro:      15082737c28bbf5b
    seed ricalcolato:       15082737c28bbf5b
    scelta ricalcolata:     V01
    scelta registrata:      V01
    classifica:             identica
    esito:                  IDENTICO

**`whycode replay <id> --regole rules-1.1.0`**: "ricalcolo", cioe' replay con regole diverse. Non sovrascrive niente: mostra cosa cambierebbe oggi.

    $ whycode replay CLP-20261017-0001 --regole rules-1.1.0
    esito: DIVERGENTE (atteso: le regole sono cambiate)
    scelta registrata:      V01
    scelta con regole nuove: V02
    criterio che cambia:    incastro (pesi nuovi nel profilo a3)
    suggerimento:           se la nuova regola e' approvata, appendere un override umano

**`whycode diff <idA> <idB>`**: confronta due eventi.

    $ whycode diff CLP-20261017-0001 CLP-20261017-0002
    campo                  A                     B
    intento_id             INT-0007              INT-0009
    capacita               media                 bassa
    classe varianti        3                     2
    seed                   15082737c28bbf5b      fe06fece57ce5ed5
    scelta                 V01                   V01r
    nota: contesti e intenti diversi. Per confronti veri usare due righe con
    stesso mc_hash e stesso vincoli_hash (a parita' di regole).

**`whycode audit --file registro/collassi.jsonl`**: verifica l'intero registro.

    $ whycode audit
    righe:                 3
    formato (schema):      OK
    catena di hash:        OK (3 su 3)
    seed coerenti:         OK (3 su 3)
    id unici:              OK
    timestamp monotoni:    OK
    scelte esistenti:      OK (le righe fallite hanno scelta null)
    prima riga divergente: nessuna
    esito:                 REGISTRO INTEGRO

**`whycode test-determinismo <id> --ripetizioni 100`**: il test che conta (vedi 6.3).

**`whycode ripeti <id> --scegli V02 --motivo "testo"`**: override umano. Appende un nuovo evento con `sostituisce` e `override_umano: true`. Non tocca la riga originale.

### 6.3 Test di determinismo (stesso input 100 volte: stessa scelta tutte le volte)

Protocollo, passo per passo:

1. Si congela un caso: la riga `CLP-20261017-0001` con il suo magazzino.
2. Si lancia K 100 volte, in 100 processi separati, con la cache dei punteggi piena.
3. Si ripete in 3 giorni diversi, con la macchina in stati diversi (riavvii compresi), in 2 cartelle di lavoro diverse.
4. Si mescola l'ordine di lettura delle varianti in metanalisi (per assicurarsi che l'ordinamento canonico regga).
5. Si confrontano: scelta, classifica completa, motivo, seed. Tutto deve essere identico in 100 casi su 100.
6. Il report si salva in `registro\report\determinismo-<id>-<data>.json`.

Output atteso:

    ripetizioni:            100
    scelte distinte:        1   (V01)
    classifiche distinte:   1
    seed distinti:          1
    divergenze:             0
    esito:                  DETERMINISMO CONFERMATO

Analogamente per il percorso completo (generazione con cache + misura + collasso): con le misure registrate la prima volta, il percorso e' riproducibile al 100% anche a distanza di mesi.
Questa e' la promessa di Whyed resa testabile: "stesso input, stessa scelta, sempre" non e' una frase, e' un test che gira.

### 6.4 Limiti onesti del replay generativo

- Rigenerare le varianti da zero (stesso seed, stesso motore) da' lo stesso esito solo con la stessa build del motore e lo stesso hardware. Per questo il magazzino e' la fonte di verita'.
- Il modello puo' essere aggiornato nel tempo: il registro lo cita per versione, cosi' si sa sempre con che cosa e' stata fatta una scelta.
- Il rumore dei tempi e' mitigato da mediana, risoluzione 1 ms e quantizzazione a 50 punti. Resta il caso di scarto stretto (< 100 punti): registrato e segnalato (4.8).

---

## 7. Perche' "quantistico" e perche' "deterministico"

Questa sezione rende giustizia alle parole di Whyed senza fisica sbagliata. Le sue parole (14/10/2026): "in maniera deterministica ma appunto quantistica". E il PROGETTO.md lo dice in una riga, che qui si riprende parola per parola:

> Il "quanto" e' lo spazio delle possibilita'. Il "deterministico" e' il collasso registrato.

### 7.1 Il "quanto": lo spazio delle possibilita'

Per ogni intento esistono N modi di realizzarlo in un linguaggio target: idiomi, librerie, strutture dati, stili (Livello 2 del PROGETTO).
Questi N modi **coesistono** come stati possibili. Nessuno e' "il programma" finche' non serve:

- Lo spazio si descrive (varianti + schede) ma **non si decide**.
- La generazione materializza le alternative una per una, pigramente: si fa solo quando il codice serve davvero.
- La decisione e' **rinviata al momento del bisogno**. Questo e' il senso operativo di "superposizione": stati alternativi rappresentati insieme, esito non fissato.

### 7.2 Il "deterministico": il collasso registrato

Quando il codice serve, avviene il collasso:

- La **misura** e' classica e concreta: compilazione, test, benchmark, stime.
- La **scelta** e' una funzione pura `K` degli input registrati: `(h_MC, h_V, h_X, R, s, schede)`.
- L'esito e' **unico e registrato**: una riga JSONL con catena di hash.
- Ripetere lo stesso input produce lo stesso esito, sempre. Se non fosse cosi', il registro non avrebbe senso ed e' proprio il registro che lo rende verificabile.

Il ponte tra le due parole: **il collasso e' l'unico momento in cui lo spazio diventa una cosa sola, e quel momento e' deterministico e scritto**.

### 7.3 Analogie corrette

| Analogia | Dove regge | Dove si ferma |
|---|---|---|
| Superposizione | stati alternativi rappresentati insieme, non decisi | e' informazione, non fisica: nessuna ampiezza complessa, nessuna interferenza |
| Collasso (misura) | una scelta emerge al momento del bisogno, per effetto della misura (i test) | la misura qui e' classica (esecuzione di test), non un processo fisico |
| Pseudo-casualita' con seed | un processo deterministico che "sembra" vario: e' esattamente il mestiere di un PRNG seedato | non c'e' imprevedibilita' vera: il seed e' pubblico e derivato |
| "Quantum-inspired" | nome usato in letteratura per algoritmi ispirati a idee quantistiche senza fisica quantistica | nessun vantaggio quantistico, nessun qubit, nessuna velocita' in piu' |

### 7.4 Cosa NON e' quantistico (limiti dell'analogia)

Da dire chiaro, per non raccontare fisica falsa:

- Non ci sono qubit, ampiezze, fasi, interferenza, entanglement.
- Le varianti non "collassano" in senso fisico: sono file su disco che aspettano una scelta.
- Il collasso non e' probabilistico: e' una funzione. Il "caso" non esiste in nessun punto del percorso.
- Non c'e' nessun parallelismo quantistico e nessuno speedup da vendere.
- L'analogia e' **di progetto**: rinviare la decisione, decidere per misura, registrare l'esito. Questa e' la parte che serve a WhyCode, ed e' vera.

### 7.5 Tabella "detto comune / cosa vale qui"

| Detto comune | Cosa vale davvero qui |
|---|---|
| "Le varianti sono in superposizione fisica" | No: sono alternative rappresentate e non decise. Nessuna fisica. |
| "Il collasso e' un evento casuale" | No: e' una funzione pura. Stessa risposta, sempre. |
| "Il seed e' casuale" | No: e' derivato dagli hash degli input. Serve a decorrelare, non a sorprendere. |
| "Cambiare una virgola cambia tutto a caso" | No: cambia in modo riproducibile. Il registro lo prova. |
| "WhyCode e' piu' veloce perche' quantistico" | No: nessun vantaggio quantistico. Il vantaggio e' qualita', incastro e tracciabilita'. |
| "Scegliere a caso tra le migliori va bene lo stesso" | No: violerebbe la promessa del registro. Scartata, vedi 10.3. |

---

## 8. Costi e controllo dello spazio

### 8.1 Il rischio esplosione combinatoria (con numeri)

Lo spazio cresce come prodotto degli assi (2.2). Per l'intento CSV: 7 strategie x 3 modi di leggere il file x 2 gestioni dei bordi x 2 stili = 84 combinazioni **sensate**. Ma il generatore scrive testo libero: lo spazio reale e' molto piu' grande (migliaia di programmi validi).

Costo di un'esplorazione completa, conti in chiaro: 84 combinazioni x (generazione 15 s + test 1 s) = circa 22 minuti **per un intento piccolo**, con 84 x 500 = 42000 token di uscita. Su intenti grandi: ore e decine di migliaia di token. Non si fa. Mai enumerare tutto.

### 8.2 Quando NON esplorare

1. **Riuso**: la chiave `(h_MC, h_V, h_X, R)` e' gia' nel registro e i test rapidi passano: zero generazione, si riusa la scelta (registrata come evento `riusato`). E' l'effetto "ogni volta piu' resistente".
2. **Intento banale**: frammento sotto le 30 righe attese: 3 varianti e basta.
3. **Deadline**: modalita' rapida, 3 varianti, niente bench.
4. **Riparazione**: non si esplora di nuovo: si ripara il vicino (temperatura bassa, ciclo breve).
5. **Risorse corte**: si scende nella scala della capacita' (8.5), si registra la modalita' e si va avanti.

### 8.3 Campionamento intelligente (mai forza bruta)

- **Stratificato**: un rappresentante per strategia, poi si riempie fino a N sugli assi scoperti. Garantisce copertura senza esplosione.
- **Scrematura a budget (successive halving, stile Hyperband)**: si genera e si testa tutto (i test sono economici), si tengono le migliori 3, si fa il bench solo alle migliori 2. Il bench, che e' la parte costosa, tocca pochi candidati.
- **Vicinato**: se una variante eccelle su un asse, si generano 1 o 2 vicini a temperatura bassa intorno a lei (raffinamento), invece di nuove strategie a caso.
- **Stop presto**: se le prime 3 varianti falliscono tutte per lo stesso identico motivo, si corregge il prompt di generazione (il difetto e' a monte), non si generano altre 4 varianti che falliranno uguale.

### 8.4 Budget (tempo, token, memoria)

Configurazione di default (file `whycode.config.json`, valori tarabili):

    {
      "tempo_massimo_s": 300,
      "token_uscita_massimi": 8000,
      "memoria_massima_mb": 4096,
      "varianti_massime": 15,
      "cicli_riparazione": 3,
      "riparazioni_per_ciclo": 5
    }

| Risorsa | Default | Massimo (notturno) | Guardia |
|---|---|---|---|
| Tempo | 300 s | 3600 s | stop a fine budget, si collassa con quello che c'e' |
| Token di uscita | 8000 | 40000 | stop, e `budget_esaurito: true` nel record di generazione |
| Memoria | 4096 MB | 70% della RAM libera | mai oltre la soglia: si degrada (8.5) |
| Varianti | 15 | 30 | tetto della classe di contesto (2.6) |

Se il budget finisce a meta', non si butta via niente: si collassa sulle varianti prodotte, si registra che il budget era esaurito, e la prossima volta la classe di contesto lo sapra'.

### 8.5 Degradazione con grazia (il PC di Whyed e' corto di RAM)

La Fase 0 e' dichiarata "a prova di PC piccolo" nel PROGETTO: si progetta per girare anche senza modello, con regole pure. La scala:

| Modalita' | RAM libera | Varianti | Motore | Bench | Valore scritto nel contesto |
|---|---|---|---|---|---|
| piena | >= 24 GB | 15 - 30 | WhyLocalLM grande | completo | "piena" |
| media | 12 - 24 GB | 7 | WhyLocalLM medio q4 | migliori 2 | "media" |
| bassa | 6 - 12 GB | 3 - 5 | WhyLocalLM piccolo q4 | spento | "bassa" |
| minima | < 6 GB | 1 - 3 | niente modello: regole pure e template dalla memoria | spento | "minima" |

Regole d'oro della degradazione:

1. **Mai bloccarsi**: c'e' sempre una via d'uscita, anche senza modello (modalita' minima).
2. **La modalita' si scrive**: entra in `h_X` e nella riga di registro. Se due run danno esiti diversi solo per la capacita', il diff lo spiega (input diverso, non bug).
3. **Si dice la verita'**: in modalita' minima i punteggi di incastro e stile sono marcati `stimato` con la regola usata; niente finto rigore.

### 8.6 Riuso: la memoria che rende piu' forti

La chiave di riuso e' `(h_MC, h_V, h_X, R)`. Su un successo:

1. Si ritrovano le schede nel magazzino.
2. Si rieseguono solo i test (secondi), non la generazione (minuti).
3. Se i test passano: evento `riusato`, stessa scelta, costo di token vicino a zero.

Numeri tipici: primo collasso di un intento nel repo: ~7 varianti, ~3500 token, ~2 min. Secondo collasso identico: 0 token, ~10 s (test). E' il "ogni volta e' sempre piu' resistente" delle parole di Whyed, reso misurabile.

---

## 9. Esempio completo tracciato dall'inizio alla fine

Intentro piccolo, scelto per essere leggibile: "leggi un file CSV e conta le righe per colonna".
Tutto quello che segue e' coerente con le righe di registro della sezione 5.4 (riga 1).

### 9.1 Intento

    INTENTO INT-0007 conta_colonne_csv
      OBIETTIVO  leggi un file CSV; per ogni colonna conta le righe con valore non vuoto
      INGRESSI   percorso: testo
      USCITE     conteggi: mappa colonna verso intero, poi stampati
      EFFETTI    legge un file; scrive su stdout
      INVARIANTI il file non viene modificato; intestazione presente; ordine colonne conservato
      CASI_BORDO file vuoto; campi vuoti; virgole tra virgolette; BOM; fine riga Windows

### 9.2 Modello di Comprensione e hash

Forma canonica (stringa esatta, una riga):

    {"autore":"L1","intento_id":"INT-0007","invarianti":["intestazione presente","ordine colonne conservato","file non modificato"],"nome":"conta_colonne_csv","usi":{"effetti":["lettura file","scrittura stdout"],"ingressi":["percorso: testo"],"uscite":["conteggi: mappa colonna verso intero"]},"versione_mc":"mc-1"}

Hash SHA-256 di questa stringa (verificabile con qualsiasi tool):

    mc_hash = 70e8715e37c712fb689b9c52e4187398461dc72a9b4830d6fc284bbf112cbe53

### 9.3 Vincoli e hash

Elenco vincoli in forma canonica (id in ordine; stringa esatta, una riga):

    {"vincoli":[{"categoria":"versione_linguaggio","espressione":"python >= 3.11","id":"VIN-1","origine":"repo","prova":"pyproject.toml","severita":"dura"},{"categoria":"dipendenze","espressione":"dipendenze_esterne == 0","id":"VIN-2","origine":"umano","prova":"elenco import della variante","severita":"dura"},{"categoria":"sicurezza","espressione":"nessuna_chiamata_eval_o_exec","id":"VIN-3","origine":"umano","prova":"scansione AST","severita":"dura"},{"categoria":"stile","espressione":"profilo_repo == a3","id":"VIN-4","origine":"repo","prova":"fingerprint del repo","severita":"morbida"},{"categoria":"test","espressione":"policy == fail_closed","id":"VIN-5","origine":"umano","prova":"configurazione suite","severita":"dura"}]}

    vincoli_hash = 068411c206f2f5eb1cf6131f45e7105af3ebee7516647d19ae4fe83ffae1b63b

### 9.4 Contesto e seed

Contesto in forma canonica (stringa esatta, una riga):

    {"capacita":"media","grammatica":"tree-sitter-python-0.21","profilo_stile":"a3","sistema":"windows-11","toolchain":{"python":"3.12.4"},"wlm":"whylocallm-8b-q4"}

    contesto_hash = 8741aec0d883dd4535d3c29030b4940001c85279bbe17020f72aea3193aaf083

Seed derivato con la formula della sezione 4.2:

    s = primi 16 hex di sha256("whycode/seed/v1|" + 70e8715e...cbe53 + "|" + 068411c2...1b63b + "|" + 8741aec0...aaf083 + "|rules-1.0.0")
    s = 15082737c28bbf5b

Classe di contesto: codice dentro repo ospite, quindi 7 posti disponibili. Il budget si e' fermato a 3 varianti per la soglia di tempo: il record di generazione lo annota.

### 9.5 Varianti generate (3 codici veri, hash veri)

V01, strategia stdlib-csv-loop, dimensione 667 byte, hash_codice `d4f6d86ab195105bc4d517d28cf9cbc464ee12f890788866918a5f30c6f1bbdf`:

    import csv
    import sys


    def conta_non_vuoti(percorso: str) -> dict[str, int]:
        conteggi: dict[str, int] = {}
        with open(percorso, newline="", encoding="utf-8-sig") as f:
            lettore = csv.reader(f)
            intestazioni = next(lettore, [])
            for nome in intestazioni:
                conteggi[nome] = 0
            for riga in lettore:
                for i, cella in enumerate(riga):
                    if i < len(intestazioni) and cella.strip():
                        conteggi[intestazioni[i]] += 1
        return conteggi


    def main() -> None:
        for nome, n in conta_non_vuoti(sys.argv[1]).items():
            print(f"{nome}: {n}")


    if __name__ == "__main__":
        main()

V02, strategia stdlib-counter-funzionale, dimensione 613 byte, hash_codice `2d4357ff280704be4a2dbd76c543b84d0c4678ea4b4d2fd245bde930e7accdeb`:

    import csv
    import sys
    from collections import Counter


    def conta_non_vuoti(percorso: str) -> Counter:
        with open(percorso, newline="", encoding="utf-8-sig") as f:
            lettore = csv.reader(f)
            intestazioni = next(lettore, [])
            celle_piene = [
                intestazioni[i]
                for riga in lettore
                for i, cella in enumerate(riga)
                if i < len(intestazioni) and cella.strip()
            ]
        return Counter(celle_piene)


    def main() -> None:
        for nome, n in conta_non_vuoti(sys.argv[1]).items():
            print(f"{nome}: {n}")


    if __name__ == "__main__":
        main()

V03, strategia split-manuale, dimensione 612 byte, hash_codice `a1e0e49714bdfcd2c4d5a4c65165f7616d6130b66c1c096d22ac981798f7f959`:

    import sys


    def conta_non_vuoti(percorso: str) -> dict[str, int]:
        with open(percorso, encoding="utf-8") as f:
            righe = f.read().splitlines()
        intestazioni = righe[0].split(",")
        conteggi = {nome: 0 for nome in intestazioni}
        for riga in righe[1:]:
            celle = riga.split(",")
            for i, cella in enumerate(celle):
                if i < len(intestazioni) and cella != "":
                    conteggi[intestazioni[i]] += 1
        return conteggi


    def main() -> None:
        for nome, n in conta_non_vuoti(sys.argv[1]).items():
            print(f"{nome}: {n}")


    if __name__ == "__main__":
        main()

Nota di verifica: gli hash_codice sono calcolati sul codice normalizzato (fine riga LF, nessun newline finale, nessuno spazio in coda). Chi copia i blocchi e li controlla deve applicare la stessa normalizzazione.

### 9.6 Test ed esiti

Suite di 5 test fornita da Whyed (vincolo VIN-5: fail-closed).

| Test | Cosa verifica | V01 | V02 | V03 |
|---|---|---|---|---|
| T1 | file semplice 3 righe x 3 colonne | ok | ok | ok |
| T2 | file vuoto (0 byte) | ok | ok | fallito (IndexError sulla prima riga) |
| T3 | campi vuoti sparsi | ok | ok | ok |
| T4 | campo con virgola tra virgolette ("Roma, IT") | ok | ok | fallito (divide la cella in due) |
| T5 | BOM e fine riga Windows | ok | ok | fallito (il BOM sporca il nome della prima colonna) |
| Esito | | 5/5 | 5/5 | 2/5 |

Conseguenze: V01 e V02 ammesse (correttezza 10000). V03 scartata ai test (correttezza 4000): non entra nemmeno nel bench.

### 9.7 Benchmark (solo per le ammesse)

File di prova: 100.000 righe x 5 colonne, 4,8 MB. 3 esecuzioni per variante, si prende la mediana.

| Variante | Mediana | Note |
|---|---|---|
| V01 | 412 ms | ciclo esplicito |
| V02 | 388 ms | comprehension piu' Counter |

t_min = 388 ms (V02). V02 non e' benched oltre: e' gia' la piu' veloce.

### 9.8 Punteggi e quantizzazione (conti in chiaro)

- correttezza: V01 5/5 -> 10000; V02 5/5 -> 10000; V03 2/5 -> 4000.
- prestazioni: V02 -> 10000 (t_min); V01 -> quantizza(10000 * 388 / 412) = quantizza(9417,5) = 9400.
- incastro (stima, profilo a3, pesi: idiomi 40, riuso dipendenze presenti 20, coerenza nomi 15, forma 25): V01 87/100 -> 8700; V02 84/100 -> 8400. V02 perde per la comprehension lunga (7 righe) e per Counter, non usato altrove nel repo.
- stile (stima, regole interne): V01 86/100 -> 8600; V02 88/100 -> 8800.

Tabella finale:

| Variante | correttezza | incastro | prestazioni | stile | Esito |
|---|---|---|---|---|---|
| V01 | 10000 | 8700 | 9400 | 8600 | ammessa |
| V02 | 10000 | 8400 | 10000 | 8800 | ammessa |
| V03 | 4000 | - | - | - | scartata ai test |

### 9.9 Classifica e scelta (il collasso)

Confronto V01 contro V02, nell'ordine fissato (4.4):

1. correttezza: 10000 contro 10000. Pari.
2. incastro: 8700 contro 8400. **V01 vince, scarto 300 punti.**
3. prestazioni e stile: non si guardano nemmeno. (V02 era piu' veloce: 388 contro 412. Non basta. L'incastro viene prima.)

Scelta: **V01**. Motivo (come nel registro): "correttezza pari 5/5; incastro 8700 contro 8400, scarto 300 punti; criterio decisivo: incastro".
Seed usato: `15082737c28bbf5b`. Nessuno scarto stretto (300 > 100).

### 9.10 Riga di registro

E' la riga 1 della sezione 5.4: `CLP-20261017-0001`, `stato = collassato`, `scelta = V01`, `prev_hash` a 64 zeri (prima riga), `riga_hash` `03ca4e48ea3a56a60108fe4ae6075e33c4ed2a7a15d66452a0e195aface32898`.
Lettura umana della stessa riga:

| Campo | Valore |
|---|---|
| id | CLP-20261017-0001 |
| quando | 2026-10-17T15:42:07Z |
| intento | INT-0007 (conta_colonne_csv) |
| input | mc 70e8715e..., vincoli 068411c2..., contesto 8741aec0..., regole rules-1.0.0 |
| seed | 15082737c28bbf5b |
| varianti | 3 (V01 e V02 ammesse, V03 scartata ai test) |
| scelta | V01 |
| motivo | incastro, 8700 contro 8400, scarto 300 |
| stato | collassato |

Da qui in poi: la scelta va a SPEC-05 per l'ottimizzazione misurata (che puo' aggiungere un giro di varianti e un nuovo collasso), e poi al repo ospite. Ogni passo successivo produce nuove righe, incatenate. Il registro racconta sempre tutta la storia.

---

## 10. Decisioni aperte e alternative scartate

### 10.1 Decisioni fissate (da non rimettere in discussione senza una ragione forte)

| # | Decisione | Perche' |
|---|---|---|
| 1 | Forma canonica JSON compatta, chiavi ordinate | rende gli hash stabili e verificabili |
| 2 | SHA-256 ovunque | standard, verificabile con qualsiasi tool |
| 3 | Seed derivato dagli input (mai casuale) | riproducibilita' totale |
| 4 | Ordine criteri: correttezza, incastro, prestazioni, stile | dal PROGETTO.md; la correttezza non si negozia |
| 5 | Fail-closed sui test | non si consegna mai codice non provato |
| 6 | Catena di hash locale, registro append-only | anti-manomissione parziale e storia completa |
| 7 | Punteggi interi quantizzati a 50 | niente float, riproducibilita' bit a bit |
| 8 | Magazzino separato dal registro | registro leggero, dettagli a parte |

### 10.2 Decisioni aperte

| # | Domanda | Default attuale | Cosa manca per decidere |
|---|---|---|---|
| 1 | Firma esterna della testa della catena (es. GPG periodica)? | no, solo catena | decidere se serve; costo basso, beneficio: manomissione totale rilevabile |
| 2 | ID con contatore giornaliero o ULID ordinabili? | contatore (leggibile) | valutare se servira' ordinamento tra macchine |
| 3 | Pesi esatti dell'incastro (40/20/15/25) | come in 9.8 | tarare su repo reali, misurare il tasso di scelte "giuste" a occhio |
| 4 | Soglia di scarto stretto (100 punti) | 100 | tarare: quante volte il rumore cambia le cose davvero |
| 5 | Budget di riparazione (3 cicli x 5) | come in 4.7 | dati dai primi fallimenti reali |
| 6 | Maestro frontier: mai, on demand, o automatico? | spento di default (privacy) | decisione di Whyed; se on demand, serve un flag esplicito nel comando |
| 7 | Rotazione del registro? | append-only senza rotazione | valutare quando supera qualche MB |
| 8 | Compressione del magazzino varianti? | nessuna | decidere dopo aver visto i costi reali su disco |
| 9 | T3 (successi storici) per strategia esatta o per strategia simile? | esatta | decidere con la memoria (SPEC-06) in mano |
| 10 | Lingua dei testi nel registro (motivo, dettaglio) | italiano | valutare l'inglese se un giorno arrivano tool esterni |

### 10.3 Alternative scartate (e perche')

| Alternativa | Perche' e' stata scartata |
|---|---|
| Scelta casuale tra le migliori | viola la promessa: stesso input deve dare stessa scelta |
| Solo giudizio del modello, senza test | nessuna prova, nessuna misura; "sembra giusto" non basta |
| Enumerazione completa dello spazio | esplosione combinatoria (8.1): minuti per un caso piccolo, ore per i grandi |
| Beam search puro su tutte le varianti | costoso e poco diverso: i beam tendono a output simili tra loro; meglio campionamento stratificato con diversita' forzata |
| Punteggi in virgola mobile | non riproducibili tra macchine; si usa intero quantizzato |
| Blockchain per il registro | esagerata per un sistema personale locale; catena SHA-256 e audit bastano |
| Codice completo dentro la riga di registro | registro gonfio e illeggibile; meglio magazzino separato con hash |
| "Quasi ammessa" (passa i test al 90%) | fail-closed: nessuno sconto sulla correttezza |

---

## Appendice A: formule complete

    forma_canonica(x):
      JSON, chiavi ordinate per code point crescente (ricorsivo),
      separatori ":" e "," senza spazi, numeri interi, testo ASCII, null ammesso

    hash(x) = sha256_bytes(utf8(forma_canonica(x))) in esadecimale minuscolo

    seed:
      s = primi 16 hex di sha256("whycode/seed/v1|" + h_MC + "|" + h_V + "|" + h_X + "|" + R)

    seed di generazione della variante i:
      seed_gen(i) = primi 16 hex di sha256("whycode/gen/v1|" + s + "|" + i)

    quantizzazione:
      quantizza(x) = min(10000, max(0, 50 * round_half_up(x / 50)))

    punteggi:
      correttezza = quantizza(10000 * test_passati / test_totali)
      prestazioni = quantizza(10000 * t_min / t_variante)
      incastro, stile: stime delle regole (0..10000, gia' quantizzate)

    catena del registro:
      h_riga(0) = 64 zeri
      h_riga(n) = sha256_bytes(utf8(h_riga(n-1) + forma_canonica(evento_n senza riga_hash)))

    confronto (ordine lessicografico a quattro livelli):
      (c, f, p, st) di v  >  (c, f, p, st) di w
      con tie-break T1 dipendenze, T2 dimensione, T3 successi storici, T4 id

## Appendice B: glossario minimo

| Termine | Significato in questo documento |
|---|---|
| Intento | cosa deve fare il codice, senza il come (D1) |
| Spazio (S) | l'insieme delle realizzazioni possibili di un intento (D2) |
| Variante | un elemento concreto dello spazio, con strategia e hash (D3) |
| Vincolo | predicato sulle varianti, duro o morbido (D4) |
| Potenziale | il vettore dei quattro criteri di una variante (D5) |
| Collasso (K) | la funzione pura che sceglie e registra (D6) |
| Contesto (X) | ambiente del collasso, capacita' inclusa (D7) |
| Capacita' | classe di risorse: piena, media, bassa, minima (D8) |
| Scheda tecnica | il fascicolo misurato di una variante (D9) |
| Magazzino | deposito di varianti e schede, indirizzato da hash |
| Registro | il file JSONL dei collassi, con catena di hash |
| Seed | numero derivato dagli input, mai casuale |

## Appendice C: riferimenti e ispirazioni

- PROGETTO.md, sezione 3 (stato dell'arte) e sezione 4 (Livello 2). E' la fonte della visione.
- Kajal (arXiv 2412.08842): grammatica inferita al momento. Regge il Livello 1, a monte di questa specifica.
- SwiftTrans (ICML 2026): selezionare tra candidati diversi migliora le prestazioni del codice generato. E' la ragione tecnica del "N varianti + scelta".
- Diverse Beam Search (Vijayakumar et al., 2016): decodifica con diversita' forzata. Ispira la sezione 2.5.
- Successive halving (Jamieson e Talwalkar, 2016) e Hyperband (Li et al., 2018): scrematura a budget. Ispira la sezione 8.3.
- SplitMix64 (Steele et al., 2014) e PCG (O'Neill, 2014): generatori pseudo-casuali deterministici. Ispirano il seed derivato.
- Mersenne Twister (Matsumoto e Nishimura, 1998): lo stesso seed produce la stessa sequenza. Modello mentale del 2.3.
- Reproducible builds: stessa ricetta, stesso artefatto. Modello mentale della catena di registro.
- Tree-sitter: estrazione della scheda tecnica (3.4).
- WhyObliter: registro e report come disciplina di misura. Il registro dei collassi ne segue lo spirito.

(Queste fonti sono ispirazioni tecniche citate nel quadro di PROGETTO.md; nessuna di esse copre l'insieme di questa specifica. Il pezzo nuovo e' l'integrazione: spazio quantico, collasso deterministico, registro incatenato.)
