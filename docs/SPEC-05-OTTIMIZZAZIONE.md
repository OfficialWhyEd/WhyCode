# SPEC-05: Ottimizzazione con misura

Livello 4 di WhyCode. La specifica del "notevole".

- Versione: 1.0 (bozza approvabile)
- Data: 17/10/2026
- Stato: proposta completa, pronta per revisione di Whyed
- Dipendenze: PROGETTO.md (visione approvata), Livello 2 (spazio quantico e collasso), Livello 3 (sintesi e incastro), Livello 5 (memoria e registro)
- Applicabilita': linguaggi di partenza Python, JavaScript, C

Nota su tutti i numeri: i numeri in questo documento sono esempi illustrativi, scelti come plausibili. Non sono ancora misure reali sul PC di Whyed. Al primo run del harness vanno sostituiti con misure vere. La struttura resta valida comunque.

---

## 1. Scopo e regola d'oro

### 1.1 Perche' esiste questo livello

Le parole di Whyed: "la risposta ha un'ottimizzazione di codice notevole".

"Notevole" e' una promessa misurabile. Senza numeri non vale niente. Questo livello esiste per mantenere quella promessa con prove, non con impressioni.

Il Livello 4 prende codice gia' corretto e verificato (uscita del Livello 3) e lo rende piu' veloce, piu' leggero o piu' efficiente, senza mai romperne il comportamento.

### 1.2 La regola d'oro

> Si ottimizza solo con misura. E mai al prezzo della correttezza.

Due parti, entrambe non negoziabili:

1. **Solo con misura**: nessuna modifica viene accettata perche' "sembra piu' veloce". Ogni modifica ha un benchmark before/after registrato. Il numero e' la prova.
2. **Mai al prezzo della correttezza**: un pezzo di codice che va piu' veloce ma sbaglia un risultato e' un pezzo rotto, non un'ottimizzazione. La correttezza viene prima di tutto, sempre.

Questo segue l'ordine dei criteri del Livello 2: correttezza, poi incastro, poi prestazioni, poi stile. Le prestazioni sono terze. Non salgono mai di posto.

### 1.3 Definizioni

| Termine | Significato |
|---|---|
| Baseline | Il codice di partenza, gia' corretto, prima dell'ottimizzazione. |
| Variante | Una proposta di codice ottimizzato, generata da regole o dal modello. |
| Candidato | Una variante che ha superato i test e viene misurata. |
| Speedup | Rapporto tra tempo baseline e tempo variante. Speedup 2,0x significa "due volte piu' veloce". |
| Regressione | Peggioramento di una metrica oltre la tolleranza ammessa. |
| Accettazione | L'atto di sostituire la baseline con una variante, dopo test verdi e misura favorevole. |
| Rollback | Annullamento automatico dell'accettazione, con ritorno alla baseline. |
| Soglia | Guadagno minimo richiesto per accettare (default 5%, vedi sezione 7). |
| Tentativo | Un giro completo: proposta, test, misura, decisione. Tutti registrati. |

### 1.4 Non obiettivi (cosa questo livello non fa)

- Non inventa funzionalita' nuove. Il comportamento resta identico.
- Non cambia l'interfaccia pubblica (nomi di funzioni esportate, firme, formato dei file di output). Vietato a tutti i livelli.
- Non richiede cloud. Gira sul PC di Whyed, anche senza modello (solo regole pure).
- Non usa GPU oltre i 2 GB di VRAM disponibili. Di default: nessuna GPU.
- Non fa micro-ottimizzazioni senza numero che le giustifichi.

---

## 2. Metodologia di misura

### 2.1 Principi

1. **La stessa misura per tutti**: baseline e varianti passano dallo stesso harness, negli stessi momenti, con gli stessi input.
2. **Mai una misura sola**: ogni numero e' una mediana di ripetizioni, con dispersione dichiarata.
3. **Il rumore si combatte, non si ignora**: il PC di Whyed ha altri processi. La sessione di misura si isola per quanto possibile (sezione 2.6).
4. **Il contesto si registra**: macchina, versioni, parametri, ora. Un numero senza contesto non e' riproducibile.
5. **Misura end-to-end e misura interna**: si registrano entrambe. Il tempo del processo intero (T_wall) e il tempo della regione misurata dentro il codice (T_core).

### 2.2 La macchina di riferimento

- PC di Whyed, Windows, 2 GB di VRAM, RAM limitata.
- Tutte le misure di confronto avvengono sulla stessa macchina. Confronti tra macchine diverse sono vietati (sezione 12).
- Prima di ogni sessione: notebook collegato alla corrente, piano energia "Prestazioni massime", zero render o giochi in corso.
- Fingerprint macchina salvato con ogni sessione: CPU, numero core, RAM, build di Windows, versioni di python, node, gcc/clang. Due sessioni si confrontano solo con fingerprint uguale.

### 2.3 Il ciclo di misura

Ogni misura segue sempre lo stesso ciclo in 7 fasi:

1. **Preparazione**: dati di input fissi (generati con seed fisso, hash registrato), compilazione dove serve (una volta sola, fuori dalla misura), cartella di lavoro fissa.
2. **Calibrazione di apertura**: girano i 3 carichi di calibrazione (sezione 2.10). Se la macchina e' in stato anomalo, la sessione si segnala.
3. **Warmup**: 3 run complete scartate. Servono a scaldare cache CPU, page cache del disco, JIT di Node, import di Python.
4. **Misure**: N run intervallate tra baseline e varianti (base, var, base, var, ...) per annullare la deriva lenta della macchina.
5. **Controlli**: hash dell'output a ogni run. Se l'output cambia tra run, la misura e' invalida.
6. **Statistiche**: mediana, MAD (scarto assoluto mediano), min, max, per baseline e per ogni candidato.
7. **Chiusura**: calibrazione finale. Se il drift tra apertura e chiusura supera il 5%, la sessione e' marcata "deriva" e si ripete.

### 2.4 Warmup e ripetizioni

| Parametro | Default | Regola di aggiustamento |
|---|---|---|
| Run di warmup (scartate) | 3 | Mai meno di 2. |
| Run misurate per candidato | 7 | Mai meno di 5. Se la dispersione e' alta si sale fino a 15. |
| Durata minima di un campione T_core | 100 ms | Se la regione e' piu' corta, si ripete internamente K volte e si divide per K. |
| Ordine delle run | intervallato base/var | Mai tutte le baseline prima e tutte le varianti dopo. La deriva falsa i confronti. |

Perche' il warmup conta, linguaggio per linguaggio:

- **Python**: import dei moduli, costruzione di cache interne, warming del bytecode. Le prime run sono sistematicamente piu' lente.
- **Node.js**: il JIT di V8 compila a caldo. Le prime run girano in interprete, le successive in codice compilato. Senza warmup il confronto e' tra cose diverse.
- **C**: nessuna VM, ma la page cache del disco e la cache CPU contano. Il binario si compila una volta, fuori dalla misura.

### 2.5 Mediana e dispersione

- Si usa la **mediana**, non la media. La media si fa trascinare da un singolo run disturbato.
- Si dichiara sempre il **MAD**: mediana delle distanze assolute dalla mediana. E' robusto come la mediana.
- Si dichiarano anche min e max, per trasparenza.
- **Regola di accettabilita'**: se MAD diviso mediana supera il 5%, il numero non e' affidabile. Si fanno 5 run in piu'. Se non basta, si ripete la sessione a macchina piu' quieta.
- **Regola del rumore**: un guadagno e' reale solo se la differenza tra le mediane supera 2 volte il MAD maggiore tra baseline e variante. Guadagno piu' piccolo del rumore = non misurabile = non si accetta.

Esempio (numeri illustrativi): baseline mediana 12400 ms, MAD 310 ms. Variante mediana 4100 ms, MAD 90 ms. Differenza 8300 ms, enorme rispetto a 2x310=620 ms. Guadagno reale. Se invece la variante fosse 12100 ms con MAD 400 ms, la differenza 300 ms sarebbe sotto il rumore. Verdetto: neutro.

### 2.6 Isolamento dal rumore di fondo

Il PC di Whyed non e' un laboratorio. Queste contromisure sono obbligatorie:

1. **Lock di misura**: un file di lock (`.bench.lock`) nella cartella del progetto. Una sola sessione di misura alla volta. Se il lock esiste, l'harness rifiuta di partire.
2. **Modalita' silenzio**: checklist prima della sessione: chiudere browser, video, render, backup, antivirus con scansione in corso. L'harness chiede conferma all'utente con una lista.
3. **Priorita' del processo**: la run misurata parte con priorita' alta (su Windows: classe di priorita' HIGH). Mai REALTIME, che puo' bloccare il sistema.
4. **Niente output a console**: stdout e stderr rediretti su file temporaneo. Scrivere su console e' lento e rumoroso. L'output vero si verifica leggendo il file.
5. **Thread nascosti bloccati**: `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `UV_THREADPOOL_SIZE=1`, `MKL_NUM_THREADS=1`. Cosi' il parallelismo nascosto non confonde la misura. Chi vuole parallelismo lo dichiara come variante misurata a parte.
6. **Interleaving**: le run di baseline e varianti si alternano (sezione 2.3, fase 4). Cosi' una ventata di rumore colpisce tutti allo stesso modo.
7. **Processo fresco**: ogni run e' un processo nuovo. Nessuno stato condiviso tra run, a parte la cache del sistema operativo, che e' uguale per tutti.
8. **Pausa breve tra run**: 200 ms di pausa tra una run e l'altra. Evita che il sistema accumuli code di I/O.

### 2.7 Timeout e fallimenti

| Situazione | Comportamento |
|---|---|
| Run supera il timeout | Il processo viene ucciso. La run e' esclusa. Se succede 2 volte, la variante e' marcata TIMEOUT e scartata. |
| Variante va in crash | Esclusa immediatamente. Registrata con esito "crash". |
| Output diverso dalla baseline | Esclusa immediatamente. E' una regressione di correttezza, il caso piu' grave. |
| Dispersione troppo alta | La sessione e' marcata "instabile". Numeri dichiarati, nessuna accettazione. |
| Timeout del budget totale | Si chiude la sessione con quello che c'e'. Nessuna accettazione parziale senza numero completo. |

Timeout per livello (default, configurabili):

| Livello | Timeout singola run | Budget sessione per file |
|---|---|---|
| 1 conservativo | 60 s | 2 minuti |
| 2 standard | 120 s | 10 minuti |
| 3 spinto | 300 s | 30 minuti |

### 2.8 Tempo equo tra Python, Node.js e C

Due orologi, sempre entrambi:

- **T_wall**: il tempo del processo intero, misurato dal padre (l'harness), da prima dello spawn a dopo l'uscita. Include avvio dell'interprete e teardown.
- **T_core**: il tempo della regione misurata, misurato dentro il programma. Inizia subito prima del lavoro e finisce subito dopo.

La metrica primaria dipende dal caso:

| Tipo di caso | Metrica primaria | Perche' |
|---|---|---|
| Funzione o libreria | T_core | Il costo di avvio dell'interprete non c'entra col lavoro. |
| Strumento da riga di comando | T_wall | L'utente sente il tempo totale. |
| Confronto tra linguaggi | Entrambe dichiarate | T_wall onesto (l'utente paga l'avvio), T_core per il merito algoritmico. |

Regole di equita', uguali per tutti i linguaggi:

1. Stesso input, stesso file, stesso seed, stessa cartella. Hash del dataset registrato.
2. Stesso warmup (3 run) per tutti.
3. Per C: la compilazione si fa una volta, fuori dalla misura. Baseline e variante con gli stessi flag di default del repo. Un cambio di flag e' una variante a se', dichiarata e misurata.
4. Per Python: si esclude la fase di import dalla misura primaria solo se il caso e' "funzione". Per i casi CLI, l'import resta dentro T_wall. Entrambi i numeri nel report.
5. Per Node.js: mai misurare senza warmup (il JIT falsa tutto). Il numero dichiarato arriva sempre da run calde.
6. Nessun linguaggio riceve input semplificati per farlo vincere. La stessa difficolta' per tutti.

Timer interno, gli snippet di riferimento:

Python:

```python
import time

t0 = time.perf_counter()
# regione misurata: inizia qui
lavoro()
# regione misurata: finisce qui
t1 = time.perf_counter()
print(f"MISURA_MS { (t1 - t0) * 1000.0:.3f }", file=sys.stderr)
```

Per regioni sotto i 100 ms, si usa un ciclo interno:

```python
import time

K = 100  # si alza finche' una misura non supera i 100 ms
t0 = time.perf_counter()
for _ in range(K):
    lavoro()
t1 = time.perf_counter()
print(f"MISURA_MS { (t1 - t0) * 1000.0 / K:.3f }", file=sys.stderr)
```

Node.js:

```javascript
const t0 = process.hrtime.bigint();
// regione misurata
lavoro();
const t1 = process.hrtime.bigint();
console.error(`MISURA_MS ${Number(t1 - t0) / 1e6}`);
```

Per il ciclo interno vale la stessa regola di Python.

C (Windows e Linux):

```c
#include <time.h>

struct timespec t0, t1;
clock_gettime(CLOCK_MONOTONIC, &t0);
/* regione misurata */
lavoro();
clock_gettime(CLOCK_MONOTONIC, &t1);
double ms = (t1.tv_sec - t0.tv_sec) * 1000.0
          + (t1.tv_nsec - t0.tv_nsec) / 1e6;
fprintf(stderr, "MISURA_MS %.3f\n", ms);
```

Su Windows con MSVC molto vecchio, alternativa: `QueryPerformanceCounter` e `QueryPerformanceFrequency`.

L'harness legge la riga `MISURA_MS` da stderr come T_core, e misura comunque T_wall dal processo padre. I due numeri devono raccontare la stessa storia: se T_core e' grande quasi quanto T_wall in un caso CLI, ok. Se T_core e' il 2% di T_wall in un caso che dovrebbe essere dominato dall'avvio, e' normale. Se T_core supera T_wall, c'e' un errore di misura e la run si scarta.

### 2.9 Memoria di picco

- **Metodo primario (uguale per tutti i linguaggi)**: il padre campiona la memoria del processo figlio ogni 10 ms e prende il massimo. Su Windows si legge il working set (contatore `PeakWorkingSetSize` quando disponibile, altrimenti massimo dei campioni). Su Linux, RSS massimo dai campioni piu' `ru_maxrss` quando presente.
- **Metodo complementare (per diagnosi)**:
  - Python: `tracemalloc` intorno alla regione, per sapere dove si alloca.
  - Node.js: `process.memoryUsage().rss` e le statistiche heap di V8.
  - C: `GetProcessMemoryInfo` su Windows, `/proc/self/status` su Linux.
- Il numero dichiarato nel report e' quello primario. Il limite noto: il campionamento puo' perdere picchi sotto i 10 ms. Per questo il campione si prende anche a fine regione e si tiene il massimo.
- Si dichiara sempre: memoria di picco baseline, memoria di picco variante, differenza percentuale.

### 2.10 Calibrazione

Tre carichi fissi, uno per linguaggio, eseguiti a inizio e fine sessione:

| Carico | Linguaggio | Lavoro | Tempo atteso di riferimento (esempio) |
|---|---|---|---|
| CAL-P | Python | somma di 50 milioni di interi | 1800 ms |
| CAL-N | Node.js | somma di 50 milioni di interi | 350 ms |
| CAL-C | C | somma di 500 milioni di interi | 300 ms |

- Se il tempo di calibrazione si discosta piu' del 5% dalla mediana delle ultime 10 sessioni, la macchina e' in stato diverso (termico, memoria occupata, processo nascosto). La sessione parte con il flag "deriva macchina".
- La calibrazione non normalizza i risultati. Serve a decidere se fidarsi, non a correggere i numeri. Correggere i numeri e' un trucco (sezione 12).

### 2.11 Tabella completa del protocollo (PROTOCOLLO-1)

| Parametro | Valore |
|---|---|
| Nome protocollo | PROTOCOLLO-1 |
| Warmup | 3 run scartate |
| Run misurate | 7 (5 minimo, 15 massimo) |
| Durata minima campione T_core | 100 ms (ciclo interno K) |
| Statistica | mediana + MAD + min + max |
| Soglia di dispersione | MAD/mediana <= 5% |
| Soglia di rumore per accettare | differenza > 2 x MAD maggiore |
| Interleaving | si, base/var alternati |
| Pausa tra run | 200 ms |
| Campionamento memoria | ogni 10 ms |
| Priorita' processo | alta |
| Output | stdout/stderr su file temporaneo |
| Variabili ambiente fisse | OMP_NUM_THREADS=1, OPENBLAS_NUM_THREADS=1, UV_THREADPOOL_SIZE=1, MKL_NUM_THREADS=1 |
| Lock | .bench.lock, una sessione alla volta |
| Calibrazione | all'inizio e alla fine |
| Controllo output | hash sha256 a ogni run |
| Fingerprint macchina | registrato con la sessione |

Chi cambia un parametro del protocollo deve versionarlo (PROTOCOLLO-2) e i confronti con sessioni vecchie si dichiarano non comparabili. Questa e' la regola che rende i numeri confrontabili tra mesi.

---

## 3. Metriche complete

### 3.1 Tempo di esecuzione (metrica primaria di default)

- Unita': millisecondi. Report anche in secondi quando supera i 1000 ms.
- Due letture: T_wall e T_core (sezione 2.8).
- Dove si applica: sempre, ogni caso.
- Trappole: misurato una volta sola non vale niente; senza warmup mente; confrontare run con cache diverse (disco caldo contro freddo) falsa tutto. Per questo il protocollo e' fisso.

### 3.2 Memoria di picco

- Unita': MB (megabyte, base 1024).
- Misura: sezione 2.9.
- Dove si applica: sempre. Su casi che caricano dati in memoria, e' spesso la metrica piu' importante dopo il tempo.
- Trappole: il campionamento a 10 ms puo' mancare picchi brevissimi. Un picco mancato non e' un picco inesistente. Sui casi a rischio si usa anche il metodo interno del linguaggio.

### 3.3 Dimensione output

- Unita': byte.
- Misura: dimensione dei file prodotti (somma dei byte) piu' un hash del contenuto.
- Dove si applica: casi che scrivono file o che producono dati. Per casi senza output su file: dimensione del flusso su stdout, misurata dal padre.
- Trappole: comprimere o deduplicare l'output per far calare il numero senza toccare la sostanza e' una posa, non un'ottimizzazione, se il formato di output e' vincolato. Se il formato lo permette, e' una variante legittima da dichiarare.

### 3.4 Throughput

- Unita': operazioni al secondo (elementi/s, righe/s, byte/s).
- Misura: lavoro svolto diviso T_core. Il "lavoro" e' dichiarato nel caso (numero di righe, elementi, byte).
- Dove si applica: pipeline e tool su flussi. Rendere il confronto tra taglie diverse piu' leggibile.
- Trappole: il throughput calcolato su T_wall include l'avvio e sembra basso su lavori corti. Si calcola sempre su T_core e si dichiara.

### 3.5 Latenza I/O

- Unita': millisecondi per operazione, e MB/s per trasferimento.
- Misura: per i casi dominati da I/O, si misura la fase di lettura e la fase di scrittura separatamente (strumentazione nella regione). L'harness registra anche i due numeri della calibrazione del disco se il caso e' I/O pesante.
- Dove si applica: lettura file grandi, scritture ripetute, chiamate di rete locale.
- Trappole: la page cache del sistema operativo. La seconda lettura dello stesso file e' molto piu' veloce della prima. Regola: ogni run misura lo stesso stato (cache calda per tutti, o fredda per tutti). Il default WhyCode e' cache calda, dichiarata nel report.

### 3.6 Metriche per caso (algoritmiche)

Numeri che raccontano il lavoro, non il tempo. Servono a smascherare i finti guadagni.

| Metrica | Cosa conta | Come si misura | Quando serve |
|---|---|---|---|
| Passaggi sui dati | Quante volte il codice scorre l'input | Contatore incrementato a ogni passata, oppure analisi statica del codice | Sempre sui casi con cicli su collezioni |
| Confronti | Quante volte si confrontano elementi | Contatore nei punti di confronto | Algoritmi di ordinamento, ricerca, filtri |
| Allocazioni | Quante allocazioni dinamiche | Contatore intorno alle allocazioni (in Python: wrapper su list/dict; in C: conteggio di malloc) | Casi con memoria come metrica chiave |
| Chiamate a funzione | Quante chiamate interne | Contatore, o profiler con conteggio | Casi con funzioni pure ripetute (memoizzazione) |
| Letture I/O | Quante read/write di sistema | Contatore nel wrapper I/O | Casi file-based |

Esempio di lettura: una variante e' 3x piu' veloce e fa lo stesso numero di passaggi sui dati. Guadagno plausibile: costanti, cache, libreria. Una variante e' 3x piu' veloce e fa un passaggio invece di tre. Guadagno spiegato: riduzione del lavoro. Se i passaggi calano ma il tempo non cala, c'e' qualcosa da capire (sezione 5: la misura guida la ricerca).

Queste metriche sono dichiarate "strumentate" quando modificate per contare. La strumentazione non deve cambiare la logica. Se la cambia, il test di correttezza non copre piu' lo stesso codice, ed e' vietato.

### 3.7 Tabella riassuntiva

| Metrica | Unita' | Primaria? | Sempre presente? | Strumento |
|---|---|---|---|---|
| Tempo T_wall | ms | Dipende dal caso | Si | padre (harness) |
| Tempo T_core | ms | Dipende dal caso | Si | timer interno |
| Memoria di picco | MB | No (di norma) | Si | campionamento 10 ms |
| Dimensione output | byte | No | Si (se c'e' output) | file e hash |
| Throughput | op/s | No | Si sui flussi | calcolo su T_core |
| Latenza I/O | ms e MB/s | No | Sui casi I/O | strumentazione regione |
| Passaggi sui dati | conteggio | No | Sui casi con cicli | contatore |
| Confronti | conteggio | No | Dove ha senso | contatore |
| Allocazioni | conteggio | No | Dove ha senso | contatore |
| Chiamate | conteggio | No | Dove ha senso | contatore |

---

## 4. Meccanismo A: varianti multiple e selezione misurata

Ispirazione: SwiftTrans (ICML 2026). Fatto chiave del paper: il codice tradotto dagli LLM e' spesso piu' lento di quello scritto a mano, e la sola scrittura del prompt non risolve. La loro risposta: generare candidati diversi (Multi-Perspective Exploration con MpTranslator: fino a 10 candidati da 10 insiemi di esempi) e poi scegliere con un confronto a coppie (DiffSelector). Conclusione della ricerca: diversita' piu' selezione batte la generazione singola.

### 4.1 Adattamento a WhyCode

Il meccanismo A di WhyCode:

1. Si generano N varianti ottimizzate dello stesso codice, da angolature diverse.
2. Tutte passano il cancello di correttezza (test completi, output identico).
3. Solo le corrette vengono misurate.
4. Si sceglie la migliore per numero, non per preferenza.

La differenza dal paper: il selettore di WhyCode e' la **misura**, non un giudice LLM. Il giudice LLM resta come pre-filtro statico economico quando N e' grande: riduce i candidati da misurare, ma non decide mai da solo chi vince.

### 4.2 Angolature di generazione

Le N varianti non sono N tentativi identici. Ogni variante ha un'angolatura dichiarata:

| Angolatura | Cosa cambia | Esempio di istruzione al generatore |
|---|---|---|
| Idiomatica | Stile e costruzioni tipiche del linguaggio | "Riscrivi con le costruzioni idiomatiche del linguaggio" |
| Strutture dati | La scelta di lista, dizionario, set, heap, deque | "Scegli le strutture dati ottimali per i pattern di accesso" |
| Libreria standard | Funzioni di libreria al posto di codice scritto | "Usa le funzioni della libreria standard piu' adatte" |
| Algoritmica | Cambio di algoritmo (solo livello 3, vedi sezione 8) | "Riduci la complessita' algoritmica se possibile" |
| I/O | Modalita' di lettura e scrittura | "Ottimizza il percorso dei dati da sorgente a output" |
| Costanti | Cicli interni, allocazioni, alias locali | "Riduci il costo delle operazioni nel ciclo piu' caldo" |

Regole:

- Ogni variante parte dalla stessa baseline.
- Una variante applica una sola angolatura principale (puo' toccare piu' punti, ma la direzione e' una).
- Le varianti non si vedono tra loro durante la generazione. Niente contaminazione.
- Determinismo: gli stessi input, la stessa versione delle regole e lo stesso seed di generazione producono le stesse N varianti. Ogni variante ha un id stabile (hash del contenuto).

### 4.3 Procedura di selezione

1. **Filtro di correttezza**: test del repo, piu' i test generati da WhyCode (dal Livello 3). Serve il 100% di test verdi per la baseline come per ogni variante. Se la baseline non passa al 100%, il caso si ferma prima: non si ottimizza codice che non e' verificato.
2. **Pre-filtro statico** (solo se N > 5): il giudice (modello locale, a costo zero di misura) legge le varianti e ne scarta al massimo 2 palesemente non migliori (per esempio: applica una regola non pertinente, o duplica un'altra variante). Ogni scarto e' motivato e registrato.
3. **Misura completa**: ogni candidato sopravvissuto passa dall'harness (sezione 2). Interleaving con la baseline. Numero di run: 7 di default.
4. **Classifica**: ordinamento per il criterio della sezione 4.4.
5. **Decisione**: se il vincitore supera la soglia di accettazione (sezione 7), si accetta. Se nessuno la supera, il verdetto e' NEUTRO e la baseline resta.

### 4.4 Criterio di vittoria (la funzione di collasso misurata)

Default per casi a obiettivo "tempo":

1. Primo criterio: mediana T_core piu' bassa (o T_wall se il caso e' CLI).
2. Secondo criterio (pareggio entro il rumore): memoria di picco piu' bassa.
3. Terzo criterio (pareggio ancora): dimensione output piu' piccola.
4. Quarto criterio (pareggio ancora): id della variante in ordine lessicografico. Sembra strano ma serve: rende la scelta deterministica anche a parita' perfetta.

Per casi con obiettivo dichiarato diverso (per esempio "riduci la memoria"), l'ordine dei criteri si permuta: obiettivo primo, poi il tempo, poi il resto. L'obiettivo si dichiara nel caso, non si improvvisa.

Pareggio "entro il rumore" significa: differenza tra mediane minore o uguale a 2 x MAD maggiore.

### 4.5 Determinismo della selezione

Il Livello 2 impone: stesso input, stessa scelta, sempre. Qui la selezione passa per delle misure, che hanno rumore. La soluzione:

- La decisione si prende sulle **misure registrate** nel registro. Il registro e' la fonte di verita'.
- Un replay della stessa sessione rilegge i numeri registrati e riottiene la stessa scelta.
- Il replay non rimisura: ricostruisce. Se serve una nuova misura, e' una nuova sessione, con un nuovo record.
- Le varianti hanno id stabili (hash del contenuto), quindi la stessa generazione produce gli stessi concorrenti.

Cos'i' "deterministico ma quantistico" vale anche qui: N varianti in superposizione, un collasso misurato e registrato.

### 4.6 Parametri per livello

| Livello | N varianti | Angolature ammesse | Pre-filtro |
|---|---|---|---|
| 1 | 2 | idiomatica, costanti | no |
| 2 | 5 | idiomatica, strutture dati, libreria standard, I/O, costanti | no |
| 3 | 8 | tutte, inclusa algoritmica | si (se N > 5) |

---

## 5. Meccanismo B: ottimizzazione guidata da esecuzione

Ispirazione: SuperCoder (COLM 2026). Fatti chiave del paper: il modello base Qwen2.5-Coder-7B-Instruct ottiene il 61,4% di correttezza con speedup medio 1,10x; il modello fine-tuned con RL arriva al 95,0% di correttezza con 1,46x di speedup medio; con Best-of-8 si arriva a 1,93x; il reward e' "tutto o niente": 0 se un solo test fallisce, altrimenti lo speedup misurato. L'iterative refinement (rimandare al modello errori di compilazione, test falliti e prestazioni) migliora tutti i modelli, e con piu' giri puo' superare il Best-of-N.

WhyCode non fa RL (troppo costoso in locale). WhyCode imita il **ciclo**: proponi, esegui, misura, correggi. Il modello locale propone, l'esecuzione verifica, la misura decide.

### 5.1 Il ciclo in 6 passi

1. **Profilazione**: prima di toccare una riga, si trova dove va il tempo. Strumenti: cProfile (Python), `--prof` o `console.time` (Node), `perf` o un cronometro a mano per funzione (C, su Windows si usa una build con tempi per funzione). Output: una lista di 3-5 punti caldi con percentuali.
2. **Proposta**: il modello (o le regole, se il livello e' 1) riceve: il codice, il profilo, i test, il vincolo di non cambiare l'interfaccia. Produce una variante per il punto caldo principale.
3. **Esecuzione**: compila (dove serve), esegue i test. Qualsiasi errore o fallimento va nel fascicolo di feedback.
4. **Misura**: se i test sono verdi, la variante passa dall'harness.
5. **Feedback**: al giro successivo il modello riceve: errori di compilazione esatti, nomi dei test falliti e diff degli output, numeri misurati (speedup attuale), profilo aggiornato della variante. Numeri, non impressioni.
6. **Iterazione**: si ripete finche' non si incontrano i criteri di arresto (5.5) o il budget.

### 5.2 Cosa entra esattamente nel feedback

| Cosa | Dettaglio | Perche' |
|---|---|---|
| Errore di compilazione | Messaggio completo del compilatore | Il modello corregge la sintassi da solo |
| Test falliti | Nome del test, input, atteso, ottenuto | Il modello capisce cosa ha rotto |
| Output diff | Prime 50 righe di differenza | Sui casi senza test fini |
| Speedup attuale | Numero con dispersione | Il modello sa se sta andando bene |
| Profilo aggiornato | I 3 punti caldi della variante | Sposta l'attenzione se il collo di bottiglia si e' spostato |
| Cronologia | Ultimi 2 tentativi con esito | Evita di riproporre la stessa cosa |

La cronologia e' limitata a 2 tentativi per non gonfiare il prompt: il PC di Whyed ha poca RAM e il modello e' piccolo.

### 5.3 Regole a prova di allucinazione

- Il modello non dichiara mai "questo e' piu' veloce". Lo dichiara solo la misura.
- Una variante che non compila non ha diritto a nessuna fiducia, nemmeno se "sembra giusta".
- Il reward interno e' identico a SuperCoder nella filosofia: tutto o niente. Un test rosso = variante a zero, senza appello.
- Il modello non vede mai i dati del benchmark quando scrive la variante. Vede i test, non gli input di misura. Cosi' non puo' specializzarsi sui dati (anti-overfitting, sezione 10.4).
- Se il modello propone di cambiare l'interfaccia pubblica, la proposta viene rifiutata prima ancora di compilare.

### 5.4 Profilazione: dove guardare

| Linguaggio | Strumento principale | Uso |
|---|---|---|
| Python | cProfile + pstats | `python -m cProfile -s cumtime script.py` |
| Python (righe) | line_profiler, se installato | Solo per diagnosi locale |
| Node.js | `node --prof` + `node --prof-process` | Punti caldi del JIT |
| Node.js (rapido) | `console.time` intorno alle funzioni | Prima occhiata veloce |
| C | `perf` (Linux), tempi per funzione a mano (Windows) | Punti caldi reali |

Regola: la profilazione e' una diagnosi, non una prova. Il profiler distorce (overhead per chiamata). La prova e' sempre l'harness di sezione 2.

### 5.5 Criteri di arresto

Il ciclo si ferma quando il primo di questi eventi accade:

1. **Obiettivo raggiunto**: speedup >= obiettivo dichiarato per il caso (di norma 1,5x a livello 3, 1,2x a livello 2, nessun obiettivo oltre la soglia a livello 1).
2. **Senza progresso**: 2 iterazioni consecutive senza miglioramento oltre il 2%.
3. **Budget**: esaurito il tempo o le iterazioni del livello (tabella 5.6).
4. **Nulla da fare**: il profilo non mostra punti caldi ragionevoli (il tempo e' spalmato o dominato da I/O di sistema non toccabile). Verdetto onesto: "non ottimizzabile in modo sicuro".
5. **Rischio**: la prossima modifica proposta tocca una zona vietata (sezione 7.6). Si ferma e si sceglie il migliore tra i candidati gia' raccolti.

### 5.6 Parametri del ciclo per livello

| Livello | Iterazioni massime | Obiettivo speedup (indicativo) | Profilazione |
|---|---|---|---|
| 1 | 0 (solo regole) | soglia 1,05x | no |
| 2 | 3 | 1,2x | cProfile o console.time |
| 3 | 6 | 1,5x | completa |

---

## 6. Meccanismo C: catalogo delle regole di ristrutturazione

Ispirazione: MLGO (LLVM). Fatti chiave: MLGO sostituisce euristiche del compilatore LLVM con modelli addestrati; il caso inlining-for-size arriva fino a -7% di dimensione rispetto a -Oz; il caso register allocation punta sulle prestazioni; principio portante: separare le decisioni che preservano la correttezza dalle decisioni di ottimizzazione. WhyCode prende il principio (separazione, misura, miglioramento cumulativo) e lo applica a livello sorgente, con regole esplicite invece di un modello addestrato.

### 6.1 Come si legge il catalogo

- Ogni regola ha: nome, quando si applica, esempio prima/dopo, guadagno tipico atteso, rischio.
- Il guadagno tipico e' illustrativo (esempi). Va confermato con la misura sul caso concreto.
- Una regola si applica solo se pertinente al codice. Il registro salva quali regole ha applicato ogni variante.
- Le regole sono il contenuto del Livello 5 (memoria): la lista cresce con l'esperienza.
- A livello 1 si usano solo le regole con rischio "basso".
- Regola generale di sicurezza: applicare una regola su codice senza test verdi e' vietato.

Legenda rischi: **basso** = comportamento invariato in modo quasi sempre ovvio; **medio** = richiede attenzione ai bordi; **alto** = puo' cambiare il comportamento o la stabilita', serve revisione umana.

### 6.2 Regole Python

| ID | Nome | Quando si applica | Prima | Dopo | Guadagno tipico atteso | Rischio |
|---|---|---|---|---|---|---|
| P01 | Comprehension al posto del loop con append | Costruzione di liste da trasformazione | `out = []` poi `for x in xs: out.append(f(x))` | `out = [f(x) for x in xs]` | 1,3x a 2x | basso |
| P02 | Set o dict per l'appartenenza | `x in lista` dentro un ciclo, o piu' volte | `if x in lista:` | `s = set(lista)` una volta, poi `if x in s:` | Da O(n) a O(1), su 100k elementi da 50x a 5000x sui lookup | basso (serve memoria extra e elementi hashable) |
| P03 | join al posto di concatenazione nel ciclo | Stringhe accumulate con `+=` in un ciclo | `s = ""` poi `s += pezzo` | `s = "".join(pezzi)` | 5x a 50x su stringhe grandi | basso |
| P04 | Counter e defaultdict | Conteggi o accumuli con get manuale | `d[k] = d.get(k, 0) + 1` | `d = collections.Counter(iterabile)` | 1,2x a 1,6x | basso |
| P05 | Alias locale nel ciclo caldo | Metodi o funzioni globali chiamati in cicli lunghi | `ris.append(v)` nel ciclo | `append = ris.append` fuori, `append(v)` dentro | 1,1x a 1,5x | basso (leggibilita' in calo) |
| P06 | Memoizzazione | Funzione pura chiamata tante volte con input ripetuti | Chiamata diretta ripetuta | Decoratore `functools.lru_cache(maxsize=None)` | Fino a 100x e oltre con molte ripetizioni | medio (memoria, solo funzioni pure, argomenti hashable) |
| P07 | enumerate e zip | Indici con `range(len(xs))` | `for i in range(len(xs)): v = xs[i]` | `for i, v in enumerate(xs):` | 1,2x a 2x | basso |
| P08 | Generatore al posto della lista | Collezione grande consumata una volta sola | `righe = [pulisci(r) for r in f]` poi ciclo | Espressione generatore `(pulisci(r) for r in f)` | Memoria di picco da -80% a -95% su flussi grandi | medio (si consuma una volta sola) |
| P09 | bisect su lista ordinata | Ricerca ripetuta in una lista che resta ordinata | Scansione lineare | `bisect.bisect_left` | Da O(n) a O(log n), su 100k da 100x in su | medio (la lista deve restare ordinata) |
| P10 | Vettorizzazione moderata | Numeri su grandi volumi, progetto senza numpy | Ciclo Python elemento per elemento | Modulo `array` della stdlib; numpy solo se il progetto lo usa gia' | 5x a 100x su volumi grandi | medio (dipendenze, costo di import, dtype) |

### 6.3 Regole JavaScript (Node.js)

| ID | Nome | Quando si applica | Prima | Dopo | Guadagno tipico atteso | Rischio |
|---|---|---|---|---|---|---|
| J01 | Map e Set per lookup | Chiavi dinamiche o non stringa, lookup frequenti | Oggetto usato come dizionario | `new Map()` o `new Set()` | 1,5x a 4x sui lookup frequenti | basso (Map non si serializza come un oggetto) |
| J02 | Preallocare l'array | `push` in loop da centinaia di migliaia di giri | `arr = []` poi `arr.push(x)` | `arr = new Array(n)` poi `arr[i] = x` | 1,2x a 2x | basso (attenzione ai buchi) |
| J03 | Niente allocazioni nel loop caldo | Oggetti, chiusure o regex creati dentro il ciclo | `new RegExp(...)` o oggetto nuovo a ogni giro | Creati una volta fuori dal ciclo | 1,3x a 3x | medio (stato condiviso per errore) |
| J04 | TypedArray per i numeri | Grandi array numerici | Array di numeri normale | `Float64Array` o `Uint8Array` | 2x a 10x | medio (conversioni ai bordi) |
| J05 | Una lettura sola o stream | Letture async una per riga, o readFileSync ripetuti | Letture seriali dentro il ciclo | Un `readFileSync` o stream a chunk da 64 KB | 3x a 20x su file grandi | medio (gestione errori e backpressure) |
| J06 | Parse una volta sola | `JSON.parse` ripetuto sugli stessi dati | Parse dentro il ciclo | Parse una volta, riuso | 2x a 50x | medio (mutazioni condivise) |
| J07 | Riuso dei buffer di risultato | Array o oggetto risultato riallocato a ogni chiamata calda | Nuovo array vuoto a ogni chiamata | Buffer riusato e svuotato | 1,2x a 2x | medio (stato residuo tra chiamate) |

### 6.4 Regole C

| ID | Nome | Quando si applica | Prima | Dopo | Guadagno tipico atteso | Rischio |
|---|---|---|---|---|---|---|
| C01 | Flag di ottimizzazione misurati | Build senza ottimizzazione | `-O0` o niente flag | `-O2`, poi `-O3` se misurato meglio; stessi flag per baseline e variante | 1,1x a 3x | medio (bug latenti da undefined behavior emergono) |
| C02 | I/O bufferizzato | Lettura carattere per carattere | `fgetc` in ciclo | `fread` a blocchi (64 KB) | 5x a 30x su file grandi | basso (gestire letture parziali) |
| C03 | Meno malloc e free | Allocazioni dentro il ciclo | `malloc` e `free` a ogni giro | Buffer riusato, arena, o stack | 1,5x a 10x | alto (use-after-free, corruzione) |
| C04 | memset e memcpy | Copie o azzeramenti con loop manuale | Ciclo di copia elemento per elemento | `memcpy` (o `memmove` se le zone si sovrappongono) | 2x a 10x | medio (sovrapposizione) |
| C05 | Niente copie di struct grandi | Passaggio per valore di struct | Copia per valore a ogni chiamata | Puntatore `const` | 1,2x a 5x | basso (aliasing da capire) |
| C06 | qsort e bsearch | Ordinamento o ricerca scritti a mano | Bubble sort, scansione lineare | `qsort`, `bsearch` | 5x a 50x | medio (comparatore da scrivere bene) |
| C07 | Unroll solo se misurato | Loop piccoli e caldi, e solo se il profilo lo chiede | Unroll a occhio | Unroll confermato dalla misura (spesso il compilatore lo fa gia') | 1,1x a 1,5x | medio (icache, codice gonfio) |
| C08 | Funzioni standard ottimizzate | Ricerca di byte o sottostringhe con loop manuale | Ciclo manuale | `memchr`, `strstr` | 2x a 20x | basso (semantiche di bordo) |

### 6.5 Regole trasversali (valide in tutti e tre i linguaggi)

| ID | Nome | Quando si applica | Prima | Dopo | Guadagno tipico atteso | Rischio |
|---|---|---|---|---|---|---|
| X01 | Una passata sola sui dati | Piu' cicli che scorrono lo stesso input | Tre cicli: conta, filtra, aggrega | Un ciclo che fa tutto | 1,5x a 3x | medio (logica piu' complessa) |
| X02 | Struttura dati giusta | Pattern di accesso sbagliati per la struttura | Lista per appartenenza, array per coda | Set per appartenenza, deque per coda, heap per priorita' | Da 2x a oltre 1000x, dipende da n | medio (memoria, ordine perso) |
| X03 | Algoritmo migliore | Complessita' migliorabile | Doppio ciclo O(n^2) | Ordina e scorri O(n log n), o DP | Cresce con n; a 100k da 100x in su | alto (servono test forti e casi di bordo) |
| X04 | Cache dei risultati intermedi | Ricalcolo di valori gia' calcolati | Ricalcolo ogni volta | Cache in memoria con chiave e invalidazione chiare | 5x a 100x sui ricalcoli | alto (invalidazione sbagliata) |

### 6.6 Esempi dettagliati (blocchi completi)

P02, appartenenza:

```python
# Prima: O(n) per ogni controllo, O(n*m) in totale
visti = []
for riga in righe:
    if riga.id in visti:        # scansione della lista
        continue
    visti.append(riga.id)
```

```python
# Dopo: O(1) per controllo, O(n) in totale
visti = set()
for riga in righe:
    if riga.id in visti:
        continue
    visti.add(riga.id)
```

Numeri illustrativi: 30.000 righe. Prima: 9,7 s. Dopo: 0,05 s. Speedup circa 194x. Verifica: gli stessi id, stesso ordine di output, test verdi.

P06, memoizzazione:

```python
# Prima: ricalcolo ogni volta
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

```python
# Dopo: ogni valore calcolato una volta
import functools

@functools.lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

Numeri illustrativi: 50.000 chiamate con n ripetuti tra 20 e 32. Prima: 6,2 s. Dopo: 0,35 s. Speedup circa 17,7x. Rischio verificato: funzione pura, argomenti interi, nessuno stato esterno.

J01, Map per lookup:

```javascript
// Prima: oggetto come dizionario, chiavi numeriche convertite a stringa
const posizione = {};
for (let i = 0; i < items.length; i++) {
  posizione[items[i].id] = i;
}
const p = posizione[idCercato];   // conversione a stringa a ogni accesso
```

```javascript
// Dopo: Map con chiavi vere
const posizione = new Map();
for (let i = 0; i < items.length; i++) {
  posizione.set(items[i].id, i);
}
const p = posizione.get(idCercato);
```

Numeri illustrativi: 200.000 lookup su 200.000 chiavi. Prima: 380 ms. Dopo: 120 ms. Speedup circa 3,2x.

C02, I/O bufferizzato:

```c
/* Prima: una chiamata per carattere */
int c;
size_t righe = 0;
while ((c = fgetc(f)) != EOF) {
    if (c == '\n') righe++;
}
```

```c
/* Dopo: blocchi da 64 KB */
char buf[65536];
size_t n, i, righe = 0;
while ((n = fread(buf, 1, sizeof buf, f)) > 0) {
    for (i = 0; i < n; i++) {
        if (buf[i] == '\n') righe++;
    }
}
```

Numeri illustrativi: file da 120 MB. Prima: 6,1 s. Dopo: 0,44 s. Speedup circa 14x. Verifica: stesso conteggio righe, file con ultima riga senza newline incluso nei test.

X01, una passata sola:

```python
# Prima: tre passate
tot = sum(x for x in dati)
massimo = max(x for x in dati)
media = tot / len(dati)
```

```python
# Dopo: una passata
tot = 0
massimo = dati[0]
for x in dati:
    tot += x
    if x > massimo:
        massimo = x
media = tot / len(dati)
```

Numeri illustrativi: 10 milioni di elementi int. Prima: 740 ms. Dopo: 290 ms. Speedup circa 2,6x.

### 6.7 Regole vietate o sospette

Vietate sempre (a tutti i livelli):

- Cambiare la firma di funzioni pubbliche o il formato dei file di output.
- Disattivare controlli o eccezioni per guadagnare tempo (per esempio: `try/except` rimossi, `assert` tolti dalla logica).
- Hardcodare i dati del benchmark o risultati precalcolati per gli input di test.
- Rimuovere test per farli passare.

Sospette (ammesse solo a livello 3, con nota obbligatoria nel report):

- `-ffast-math` in C: cambia la semantica dei numeri in virgola mobile.
- Thread o processi paralleli: il guadagno su un PC rumoroso e' difficile da misurare in modo pulito. Ammessi solo con misura dedicata e dispersione dichiarata.
- Cache su disco dei risultati: introdotta solo con strategia di invalidazione scritta e testata.
- Cambio di libreria di terze parti: se aggiunge una dipendenza, va approvato.

---

## 7. Guardrail

### 7.1 Correttezza prima di tutto

Il cancello di correttezza ha quattro livelli, tutti obbligatori, in ordine:

1. **Compilazione o interpretazione senza errori** (dove applicabile).
2. **Test esistenti del repo**: 100% verdi. Zero eccezioni.
3. **Test generati da WhyCode**: casi di bordo (liste vuote, input singolo, valori limite, file vuoto), piu' i casi di errore. Generati dal Livello 3 e congelati prima dell'ottimizzazione.
4. **Confronto output**: per i casi con output su file o stdout, hash sha256 identico tra baseline e variante. Per output con numeri in virgola mobile: confronto con tolleranza dichiarata (default: differenza relativa 1e-9), mai uguaglianza binaria se la semantica non lo richiede.

Se uno solo di questi livelli fallisce, la variante e' RIFIUTATA per correttezza. Il caso piu' grave del sistema: codice veloce e sbagliato.

### 7.2 Mai regressioni

Una variante si accetta solo se:

1. Tutti i test sono verdi (7.1).
2. La metrica obiettivo migliora oltre la soglia: default guadagno >= 5% e sopra il rumore (2 x MAD).
3. Nessun'altra metrica peggiora oltre la tolleranza:

| Metrica | Tolleranza di peggioramento | Nota |
|---|---|---|
| Tempo | +5% se l'obiettivo e' memoria o dimensione | Se l'obiettivo e' il tempo, non si applica: il tempo sta migliorando. |
| Memoria di picco | +10% se l'obiettivo e' il tempo | Oltre, si rifiuta anche con speedup forte: la RAM e' limitata, memoria gonfiata = rischio crash. |
| Dimensione output | +0% se il formato e' vincolato | Output diversi sono una regressione di correttezza. |
| Passaggi sui dati | Nessuna tolleranza | Se aumentano, la variante sta solo spostando il lavoro: si rifiuta a livello 2 e 3. |

Il caso tipico di rifiuto onesto: variante 2x piu' veloce ma memoria di picco raddoppiata su una macchina con poca RAM. Verdetto: RIFIUTATA (regressione memoria). Si registra e si passa oltre.

### 7.3 Rollback automatico

- Prima dell'accettazione, la baseline e' salvata (patch inversa o copia in `backup/`). L'accettazione applica una patch, non sovrascrive a mano.
- Dopo l'applicazione si esegue un giro di verifica completo (test + hash output). Se qualcosa fallisce: rollback immediato, il file torna identico alla baseline, il record e' marcato "annullato".
- Il rollback e' a un comando singolo e non dipende dalla memoria di nessuno: lo stato e' nei file.
- Ogni accettazione lascia nel registro: hash prima, hash dopo, patch, motivo. Chiunque puo' annullare settimane dopo senza ambiguita'.

### 7.4 Budget

| Livello | Tempo per file | Tentativi massimi | Tentativi senza misura completa |
|---|---|---|---|
| 1 | 2 min | 4 | 0 (tutti misurati) |
| 2 | 10 min | 10 | 0 (tutti misurati) |
| 3 | 30 min | 20 | 2 (le proposte scartate in pre-filtro non si misurano) |

Budget esaurito significa: si chiude e si riporta lo stato. Mai sforare: il PC e' di Whyed e serve anche per altro.

### 7.5 Registro dei tentativi

Ogni tentativo, senza eccezioni, scrive una riga nel registro (formato in Appendice A). Dalla riga si deve poter capire:

- cosa e' stato provato (patch, regole applicate, variante),
- come e' andata (test, numeri, dispersione),
- cosa e' stato deciso (accettato, rifiutato, annullato) e perche',
- come rifare la stessa misura (comando, input, hash).

Un tentativo non registrato non e' avvenuto. Se il registro non si puo' scrivere, la sessione non parte.

### 7.6 Zone che non si toccano mai

- Firma delle funzioni pubbliche e formato dei dati in uscita.
- Codice di sicurezza (validazione input, gestione permessi, crittografia): ottimizzabile solo con revisione umana esplicita, mai in autonomia.
- Gestione di denaro o dati personali: fuori ambito del livello 4.
- Test e dati di test: mai modificati per far passare una variante.
- Configurazioni globali della macchina (registro di Windows, piani energia permanenti): mai.

---

## 8. Livelli di aggressivita'

### 8.1 Livello 1, conservativo

- Cosa fa: applica solo regole a rischio basso (P01-P05, P07, J01, J02, C02, C04, C05, C08, X... no, X mai). Solo trasformazioni locali, nessun cambio di struttura.
- Varianti: 2. Iterazioni del ciclo B: 0 (solo regole, nessun modello necessario).
- Obiettivo: nessun peggioramento e piccoli guadagni sicuri.
- Quando usarlo: codice condiviso, codice sensibile, prima prova su un repo mai toccato, sessione con poco tempo.

### 8.2 Livello 2, standard (default)

- Cosa fa: tutto il catalogo tranne le regole ad alto rischio (X03, X04, C03) e tranne i cambi di dipendenze. Il modello propone, il ciclo guidato gira per un massimo di 3 iterazioni.
- Varianti: 5.
- Obiettivo indicativo: 1,2x.
- Quando usarlo: il caso normale. E' il default di WhyCode.

### 8.3 Livello 3, spinto

- Cosa fa: tutto il catalogo, incluse regole ad alto rischio (X03 cambio algoritmo, X04 cache con invalidazione, C03 gestione memoria manuale) e regole sospette (6.7) con nota obbligatoria.
- Varianti: 8. Iterazioni: fino a 6. Obiettivo indicativo: 1,5x.
- Servono: test solidi (copertura alta), revisione umana della patch prima dell'accettazione finale, budget 30 minuti.
- Quando usarlo: codice critico per prestazioni, su file isolati, con Whyed presente o con test molto forti. Mai come default.

### 8.4 Tabella comparativa

| Aspetto | L1 conservativo | L2 standard | L3 spinto |
|---|---|---|---|
| Varianti | 2 | 5 | 8 |
| Iterazioni ciclo B | 0 | 3 | 6 |
| Regole ammesse | Solo rischio basso | Tutto tranne alto rischio | Tutto |
| Cambio algoritmo | No | No | Si, con test forti |
| Cache con invalidazione | No | No | Si, con strategia scritta |
| Thread o processi | No | No | Si, misurato a parte |
| Flag C extra | No | -O2 se il repo non lo ha | -O2, -O3 se misurato meglio |
| Pre-filtro statico | No | No | Si |
| Revisione umana patch | No | No | Si, prima dell'accettazione |
| Budget per file | 2 min | 10 min | 30 min |

### 8.5 Quando usare quale

- Repo nuovo, mai visto: partire da Livello 1. Il primo giro serve a capire il codice e a costruire i test.
- Repo con test verdi e attivi: Livello 2.
- File isolato, hot path chiaro, test forti: Livello 3.
- Macchina in condizioni rumorose o poca batteria: Livello 1 o rimandare. Con deriva macchina i numeri del livello 3 non valgono.

---

## 9. Report di ottimizzazione

### 9.1 Formato

Il report e' un file markdown (per gli occhi) piu' un file JSON (per il registro e i confronti). Contiene, in ordine:

1. **Intestazione**: id sessione, data e ora, macchina (fingerprint), nome protocollo, versione delle regole, livello di aggressivita', obiettivo dichiarato del caso.
2. **Oggetto**: file, hash della baseline, hash del dataset di input, comando di misura.
3. **Tabella before/after** (formato fisso, sezione 9.2).
4. **Dispersione**: mediana e MAD di ogni run set, piu' min e max.
5. **Verdetto**: uno di quelli della sezione 9.4, per metrica e finale.
6. **Registro**: id dei tentativi collegati, patch, regole applicate.
7. **Note**: limiti, rischi accettati, cose rimaste aperte.

### 9.2 La tabella before/after (formato esatto)

| Metrica | Unita' | Prima | Dopo | Delta | Verdetto |
|---|---|---|---|---|---|
| Tempo T_core (mediana) | ms | <prima> | <dopo> | <speedup o percentuale> | <verdetto> |
| Tempo T_wall (mediana) | ms | <prima> | <dopo> | <speedup o percentuale> | <verdetto> |
| Memoria di picco | MB | <prima> | <dopo> | <percentuale> | <verdetto> |
| Dimensione output | byte | <prima> | <dopo> | <percentuale> | <verdetto> |
| Throughput | op/s | <prima> | <dopo> | <speedup> | <verdetto> |
| Passaggi sui dati | conteggio | <prima> | <dopo> | <differenza> | <verdetto> |

Regole del formato:

- "Delta" per il tempo si esprime in speedup (x), per le altre metriche in percentuale.
- "Prima" e "Dopo" sono mediane, non singole run.
- La riga T_core e la riga T_wall ci sono sempre, anche se la metrica primaria e' una sola.
- Le righe senza dato (per esempio dimensione output su un caso senza output) si omettono, e il buco si spiega nelle note.

### 9.3 Esempio compilato e realistico (numeri illustrativi)

    REPORT DI OTTIMIZZAZIONE
    id sessione:      s-2026-10-17-003
    data:             17/10/2026, 15:40
    macchina:         whyed-pc (fingerprint: 8 core, 32 GB, Windows 11 build 26200)
    protocollo:       PROTOCOLLO-1
    regole:           REGOLE-1.0
    livello:          2 (standard)
    obiettivo caso:   tempo

    oggetto:          app/analisi_log.py (sha256: 3f9a...)
    dataset input:    dati/log_500mb.txt (sha256: 77bc..., generato con seed 42)
    comando:          whycode bench measure --case casi/log_grande --file app/analisi_log.py

    | Metrica              | Unita' | Prima   | Dopo   | Delta   | Verdetto    |
    |----------------------|--------|---------|--------|---------|-------------|
    | Tempo T_core         | ms     | 12400   | 4100   | 3,02x   | OTTIMIZZATO |
    | Tempo T_wall         | ms     | 13100   | 4550   | 2,88x   | OTTIMIZZATO |
    | Memoria di picco     | MB     | 1850    | 96     | -94,8%  | OTTIMIZZATO |
    | Dimensione output    | byte   | 812344  | 812344 | 0,0%    | UGUALE      |
    | Throughput           | righe/s| 403000  | 1219000| 3,02x   | OTTIMIZZATO |
    | Passaggi sui dati    | passate| 3       | 1      | -2      | OTTIMIZZATO |

    dispersione (T_core): prima mediana 12400 ms, MAD 310 ms
                          dopo  mediana 4100 ms,  MAD 90 ms
    rumore richiesto:     differenza > 2 x MAD = 620 ms (soddisfatto: 8300 ms)

    verdetto metriche:    tempo OTTIMIZZATO, memoria OTTIMIZZATA,
                          output IDENTICO, nessuna regressione
    verdetto finale:      ACCETTATO

    registro:             t-2026-10-17-000121 (proposta A, idiomatica)
                          t-2026-10-17-000122 (proposta A, streaming)  ACCETTATA
                          t-2026-10-17-000123 (proposta B, set lookup)  rifiutata: nessun guadagno
    patch:                patches/t-2026-10-17-000122.patch
    regole applicate:     P08, X01
    note:                 output verificato con hash. Cache disco calda dichiarata.
                          Il guadagno principale viene dalla lettura a flusso (P08).

### 9.4 Tassonomia dei verdetti

| Verdetto | Significato |
|---|---|
| OTTIMIZZATO | Metrica migliorata oltre soglia e oltre il rumore. |
| UGUALE | Differenza sotto il rumore. Onesto: non si e' guadagnato niente. |
| REGRESSIONE | Metrica peggiorata oltre la tolleranza. La variante si rifiuta. |
| RIFIUTATO CORRETTEZZA | Un test rosso o output diverso. Il caso peggiore. |
| TIMEOUT | La variante non finisce dentro il budget. Scartata. |
| DERIVA | Sessione inaffidabile per stato macchina. Numeri archiviati ma non validi per accettare. |
| NEUTRO | Nessuna variante supera la soglia. La baseline resta. Esito legittimo e frequente. |

---

## 10. Benchmark standard di WhyCode

### 10.1 Macchina e protocollo fissi

Un confronto tra sessioni diverse e' valido solo se:

1. Stesso fingerprint macchina (stessa CPU, stessa RAM, stessa build del sistema operativo, stesse versioni di python, node, gcc).
2. Stesso protocollo (PROTOCOLLO-1). Un cambio di protocollo bumpa la versione e rompe i confronti.
3. Stessa versione delle regole (REGOLE-1.0). Se il catalogo cambia, i risultati delle sessioni vecchie restano validi per se stessi, ma il confronto tra sessioni si fa solo a parita' di versione.
4. Stessi dataset, con hash identico.

Il fingerprint e la versione si scrivono nel report. Un confronto senza queste quattro uguaglianze viene dichiarato non valido e non entra nelle statistiche.

### 10.2 La suite WhyCode-Bench

Tre livelli:

1. **Micro (fisso, per regressioni del sistema)**: 12 casi piccoli, 4 per linguaggio, con dati generati a seed fisso. Servono a verificare che l'harness stesso non sia cambiato. Esempi: somma di una lista, ordinamento, lettura di un file piccolo, costruzione di un dizionario.
2. **Reale (per repo)**: i casi veri del codice di Whyed, congelati al momento della prima misura. Ogni caso ha: input, output atteso (hash), comando, metrica primaria.
3. **Stress (per rivelare i problemi nascosti)**: la stessa logica dei casi reali, con input grandi (per esempio 10x o 100x). Lezione da TRACE (ACL 2026): il 23,5% delle traduzioni corrette risulta inefficiente solo sotto stress; un caso reale mostrava 11,20 s contro 0,02 s, differenza invisibile sugli input piccoli. I test piccoli nascondono i problemi di efficienza, quindi lo stress test e' obbligatorio per i casi che contano.

### 10.3 Come si confrontano i risultati tra sessioni diverse

- Per ogni caso, la fonte di verita' e' la mediana T_core (o la metrica primaria dichiarata) con la sua dispersione.
- Un miglioramento tra sessioni si dichiara solo se: differenza delle mediane > 2 x MAD maggiore, macchina e protocollo e regole identici.
- Le sessioni con flag "deriva" non entrano nei confronti. Restano archiviate.
- La storia delle sessioni vive in un file unico (`bench/storia.jsonl`): una riga per sessione, con data, fingerprint, caso, numeri. Il confronto tra sessioni e' una lettura di quel file, non un ricordo.

### 10.4 Come si evita l'autoinganno

Il nemico numero uno di questo livello e' ingannare se stessi. Tabella dei trucchi e delle contromisure:

| Trucco (anche involontario) | Come si riconosce | Contromisura nel sistema |
|---|---|---|
| Misurare solo la parte comoda (escludere l'avvio o l'I/O) | T_wall e T_core raccontano storie diverse | Entrambi sempre nel report, rapporto controllato |
| Benchmark con input piccolo che nasconde il costo | Stress test a parte | Input stress obbligatorio sui casi reali |
| Cache calda per la variante e fredda per la baseline | Ordine delle run sospetto | Interleaving e stesso stato di cache dichiarato per tutti |
| Riscaldamento asimmetrico | Prime run piu' lente per uno dei due | Stesso warmup per tutti, run scartate |
| Fortuna statistica (un run fortunato) | Dispersione alta | Mediana + MAD, soglia 2 x MAD, minimo 5 run |
| Deriva della macchina a meta' sessione | Calibrazione di chiusura diversa | Doppia calibrazione, flag deriva, sessione ripetuta |
| Confronto con numeri vecchi di mesi fa | Fingerprint e versioni diverse | Confronto solo a parita' di fingerprint, protocollo, regole |
| Variante specializzata sui dati del benchmark | Il codice contiene costanti sospette | Il modello non vede mai i dati di misura; revisione patch a livello 3 |
| Baseline non rimisurata nella stessa sessione | La baseline "di ieri" sembra lenta oggi | Baseline sempre rimisurata nella sessione corrente |
| Miglioramento sul tempo che distrugge la memoria | Metrica singola guardata da sola | Tabella completa con tolleranze (sezione 7.2) |
| Test indeboliti per far passare la variante | Diff dei test sospetto | Test congelati prima dell'ottimizzazione; ogni modifica ai test invalida il record |

La regola di fondo: il sistema preferisce dire "NEUTRO" che dire "OTTIMIZZATO" senza prova. Un falso guadagno costa piu' di un guadagno mancato.

---

## 11. Esempi completi (numeri illustrativi)

Tutti i numeri di questa sezione sono esempi plausibili, non misure reali. Ogni esempio mostra: descrizione, prima, dopo, tabella, verifiche, registro.

### 11.1 Caso 1: lettura di un file grande in Python

**Descrizione**: analizzare un log da 500 MB. Contare le righe con "ERROR" e scrivere le prime 100 in un file di riepilogo.

**Prima** (`app/analisi_log.py`):

```python
def analizza(percorso):
    with open(percorso, "r", encoding="utf-8") as f:
        righe = f.readlines()          # carica tutto in memoria
    errori = []
    for riga in righe:
        if riga.startswith("ERROR"):
            errori.append(riga)
    with open("riepilogo.txt", "w", encoding="utf-8") as out:
        for riga in errori[:100]:
            out.write(riga)
    return len(errori)
```

**Dopo**:

```python
def analizza(percorso):
    errori = 0
    prime = []
    with open(percorso, "r", encoding="utf-8") as f:
        for riga in f:                 # flusso, una riga alla volta
            if riga.startswith("ERROR"):
                errori += 1
                if len(prime) < 100:
                    prime.append(riga)
    with open("riepilogo.txt", "w", encoding="utf-8") as out:
        out.write("".join(prime))
    return errori
```

**Misure (esempio)**:

| Metrica | Prima | Dopo | Delta |
|---|---|---|---|
| T_core | 12.400 ms | 4.100 ms | 3,02x |
| Memoria di picco | 1.850 MB | 96 MB | -94,8% |
| Output | hash uguale | hash uguale | identico |
| Passaggi sui dati | 3 | 1 | -2 |

**Verifiche**: stesso numero di ERROR, stesso contenuto di riepilogo (hash), test su file vuoto, file senza newline finale, file con una sola riga.

**Registro** (riga di esempio, formato completo in Appendice A):

```json
{"id":"t-2026-10-17-000122","livello":2,"file":"app/analisi_log.py","meccanismo":"B","variante":"streaming","regole":["P08","X01"],"test":{"passati":14,"totali":14},"misure":{"tempo_prima_ms":12400,"tempo_dopo_ms":4100,"speedup":3.02,"memoria_prima_mb":1850,"memoria_dopo_mb":96},"esito":"accettato","rollback":false}
```

### 11.2 Caso 2: ciclo con lookup su lista in Python

**Descrizione**: dati due elenchi da 30.000 id, trovare gli id presenti in entrambi.

**Prima**:

```python
comuni = []
for x in ids_a:
    if x in ids_b:        # O(30.000) per ogni giro
        comuni.append(x)
```

**Dopo**:

```python
insieme_b = set(ids_b)    # costruito una volta
comuni = [x for x in ids_a if x in insieme_b]
```

**Misure (esempio)**:

| Metrica | Prima | Dopo | Delta |
|---|---|---|---|
| T_core | 9.700 ms | 50 ms | 194x |
| Memoria di picco | 14 MB | 17 MB | +21% |
| Output | hash uguale | hash uguale | identico |
| Passaggi sui dati | 30.000 scansioni | 1 scansione | -29.999 |

**Verifiche**: confronto con risultato calcolato a mano su input piccolo, duplicati negli elenchi, ordine dell'output invariato.

**Nota sulla regressione memoria**: +21% su 14 MB = +3 MB. Sotto la tolleranza (10%)? No: 21% e' sopra il 10%. Ma la tolleranza si applica in valore assoluto quando la memoria e' piccola: regola aggiuntiva: se il peggioramento assoluto e' sotto i 50 MB, si accetta se il tempo migliora oltre 5x. La regola va scritta nel config: "tolleranza memoria: 10% oppure 50 MB, il piu' permissivo". Motivo: su macchine con poca RAM, 3 MB non sono un rischio, un ciclo O(n^2) si'.

### 11.3 Caso 3: chiamate ripetute a funzione pura (memoizzazione)

**Descrizione**: normalizzare 80.000 stringhe, molte ripetute. La normalizzazione fa piu' passaggi (strip, lower, rimozione accenti).

**Prima**:

```python
def normalizza(s):
    s = s.strip().lower()
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))

for riga in righe:
    chiave = normalizza(riga)
    aggiorna(chiave)
```

**Dopo**:

```python
@functools.lru_cache(maxsize=None)
def normalizza(s):
    s = s.strip().lower()
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))

for riga in righe:
    chiave = normalizza(riga)
    aggiorna(chiave)
```

**Misure (esempio)**:

| Metrica | Prima | Dopo | Delta |
|---|---|---|---|
| T_core | 6.200 ms | 350 ms | 17,7x |
| Memoria di picco | 42 MB | 61 MB | +45% |
| Output | hash uguale | hash uguale | identico |
| Chiamate effettive | 80.000 | 9.100 (il resto in cache) | -88,6% |

**Verifiche**: funzione pura verificata (nessuno stato esterno), stringhe con maiuscole, accenti composti, spazi ai bordi. Tetto della cache: `maxsize=None` e' accettabile qui perche' il vocabolario e' limitato (9.100 valori distinti). Su input illimitati si usa `maxsize` finito.

### 11.4 Caso 4: JSON ripetuto in JavaScript

**Descrizione**: 100.000 record in un array di stringhe JSON. Codice che nel ciclo interno rifa il parse per leggere un campo.

**Prima**:

```javascript
let somma = 0;
for (const riga of dati) {
  somma += JSON.parse(riga).valore;   // parse a ogni giro
}
// e piu' avanti nel codice, altri accessi rifanno il parse
```

**Dopo**:

```javascript
const record = dati.map((riga) => JSON.parse(riga));  // parse una volta
let somma = 0;
for (const r of record) {
  somma += r.valore;
}
```

**Misure (esempio)**:

| Metrica | Prima | Dopo | Delta |
|---|---|---|---|
| T_core | 4.800 ms | 600 ms | 8x |
| Memoria di picco | 210 MB | 480 MB | +129% |
| Output | hash uguale | hash uguale | identico |

**Verdetto di esempio**: qui si vede il guardrail al lavoro. Memoria +129% e' sopra ogni tolleranza. A livello 2 questo caso andrebbe rifiutato in questa forma e risolto con un parse una volta sola ma a blocchi (leggere 5.000 record, elaborare, rilasciare). La variante a blocchi: 4.800 ms a 780 ms (6,2x) con memoria 240 MB (+14%). Accettata con nota. Il sistema preferisce 6,2x con memoria quasi ferma che 8x con memoria raddoppiata.

### 11.5 Caso 5: I/O carattere per carattere in C

**Descrizione**: contare righe e colonne di un file CSV da 120 MB.

**Prima**: `fgetc` in ciclo, come in sezione 6.6.

**Dopo**: `fread` a blocchi da 64 KB, conteggio nel buffer.

**Misure (esempio)**:

| Metrica | Prima | Dopo | Delta |
|---|---|---|---|
| T_core | 6.100 ms | 440 ms | 13,9x |
| T_wall | 6.220 ms | 520 ms | 12,0x |
| Memoria di picco | 2,1 MB | 2,2 MB | +4,8% |
| Output | hash uguale | hash uguale | identico |

**Verifiche**: file con ultima riga senza newline, file con "\r\n", file vuoto, file da una riga. Il test "file con CRLF" e' importante: il formato dell'output non cambia, cambia solo il conteggio interno corretto.

---

## 12. Decisioni aperte e alternative scartate

### 12.1 Decisioni aperte (da chiudere con Whyed o con le prime misure)

1. **Numero N di varianti di default**: 5 e' la proposta. Se il PC e' lento, 3. Si decide dopo le prime sessioni reali con i tempi veri.
2. **Test statistico**: mediana + MAD e' il default proposto. Alternativa seria: bootstrap (intervallo di confidenza sulla differenza delle mediane). Costa poco in calcolo. Si prova su 2-3 casi e si sceglie.
3. **Pinning alla CPU**: legare il processo a un core specifico riduce il rumore. Su Windows richiede attenzione. Si prova; se il guadagno in stabilita' e' chiaro, entra nel PROTOCOLLO-2.
4. **Output non deterministici**: timestamp, ordini di mappe non ordinati, numeri casuali interni. Serve una regola di confronto tollerante per caso. Aperto: definire una libreria di "confrontatori" (chiamata `verifica/`) al primo caso reale che ne ha bisogno.
5. **Repo senza test**: se il repo non ha test, WhyCode genera test dal comportamento osservato della baseline. Quanto fidarsi di quei test per accettare un'ottimizzazione? Aperto: proposta di default, test generati = cancello valido solo se coprono tutti i rami del codice toccato.
6. **Modello locale nel ciclo a livello 1**: oggi escluso (regole pure). Se WhyLocalLM risponde bene a costo basso, si puo' accendere anche al livello 1. Si misura il costo in tempo.
7. **Misura dell'energia**: rimandata. Non serve alla promessa. Se un giorno il PC di Whyed va a batteria spesso, si riprende (strumenti esistono, ma aggiungono rumore).
8. **PGO per C** (profile-guided optimization): potente ma aggiunge un passo di build complesso. Fuori ambito per la Fase 5. Si rivaluta dopo.

### 12.2 Alternative scartate (e perche')

1. **Ottimizzare senza baseline misurata**: viola la regola d'oro. Scartata per definizione.
2. **Fidarsi del profiler senza misura end-to-end**: il profiler distorce e dice "dove", non "quanto". La prova e' l'harness. Il profiler resta solo come diagnosi.
3. **Flag di compilazione diversi tra baseline e variante, in silenzio**: sleale. Un cambio di flag e' una variante dichiarata e misurata come tutte le altre (C01).
4. **`-ffast-math` come leva ordinaria**: cambia la semantica dei numeri. Solo livello 3 con nota, mai default.
5. **Riscrivere il modulo in un altro linguaggio**: cambio di dipendenze e di incastro. Fuori dall'ambito del Livello 4 (questo livello ottimizza il codice nel suo linguaggio).
6. **Confrontare macchine diverse**: i numeri non sono comparabili. Ogni riferimento esterno (es. "su questa GPU") e' fuori dal registro.
7. **Benchmark in cloud**: viola il principio locale e aggiunge rumore di rete. Scartata.
8. **Auto-tuning sui test del benchmark (overfitting)**: il modello non vede mai i dati di misura. Scartata.
9. **Threading o multiprocessing come prima leva**: su un PC con altri processi il rumore e' alto e il guadagno difficile da attribuire. Ammesso solo a livello 3, misurato a parte, con dispersione dichiarata.
10. **Reinforcement learning come SuperCoder**: troppo costoso per il PC di Whyed. Si imita il ciclo (proponi, esegui, misura, correggi), non l'addestramento.
11. **hyperfine o pyperf come harness primario**: ottimi strumenti, ma non coprono il registro, il confronto tra varianti multiple, la memoria in modo uniforme tra linguaggi e l'integrazione col collasso. Restano ammessi come controprova esterna di un singolo caso.
12. **Giudice LLM come selettore finale (stile DiffSelector)**: la parola finale ce l'ha la misura. Il giudice resta solo pre-filtro. Motivo: un giudice puo' sbagliare, un cronometro no.

---

## Appendice A: formato del record di registro (JSONL)

Un record per riga, append-only, in `registro/ottimizzazioni.jsonl`.

Campi obbligatori:

| Campo | Tipo | Descrizione |
|---|---|---|
| id | string | Identificatore unico del tentativo, formato `t-AAAA-MM-GG-NNNNNN`. |
| ts | string | Data e ora ISO 8601 con fuso. |
| livello | int | 1, 2 o 3. |
| file | string | Percorso del file toccato. |
| hash_baseline | string | sha256 del file prima. |
| meccanismo | string | "A", "B" o "C". |
| variante | string | Nome o id della variante. |
| angolatura | string | Angolatura dichiarata (sezione 4.2), se meccanismo A o B. |
| regole | array | Regole applicate (es. ["P02","X01"]). |
| patch | string | Percorso della patch applicata o proposta. |
| test | object | `{"passati": N, "totali": M}`. |
| misure | object | `{"tempo_prima_ms": X, "tempo_dopo_ms": Y, "speedup": Z, "memoria_prima_mb": A, "memoria_dopo_mb": B, "madj_prima_ms": C, "mad_dopo_ms": D}`. |
| esito | string | `accettato`, `rifiutato_correttezza`, `rifiutato_regressione`, `timeout`, `crash`, `neutro`, `annullato`. |
| motivo | string | Una frase in italiano semplice. |
| rollback | bool | true se e' stato eseguito un rollback. |
| sessione | string | Id della sessione di misura. |

Esempio completo:

```json
{"id":"t-2026-10-17-000122","ts":"2026-10-17T15:22:10+02:00","livello":2,"file":"app/analisi_log.py","hash_baseline":"sha256:3f9a...","meccanismo":"B","variante":"streaming","angolatura":"I/O","regole":["P08","X01"],"patch":"patches/t-2026-10-17-000122.patch","test":{"passati":14,"totali":14},"misure":{"tempo_prima_ms":12400,"tempo_dopo_ms":4100,"speedup":3.02,"memoria_prima_mb":1850,"memoria_dopo_mb":96,"madj_prima_ms":310,"mad_dopo_ms":90},"esito":"accettato","motivo":"guadagno sopra soglia e sopra il rumore, nessuna regressione","rollback":false,"sessione":"s-2026-10-17-003"}
```

## Appendice B: comandi del harness (bozza)

La sintassi esatta e' una decisione della Fase 0/Fase 5. Questa e' la forma candidata:

```
whycode bench measure --file app/analisi_log.py --case casi/log_grande --livello 2
    Misura la baseline e produce il report di riferimento del caso.

whycode opt propose --file app/analisi_log.py --meccanismo A --n 5
    Genera le varianti e le salva come proposte (senza applicare niente).

whycode opt verify --patch patches/t-XXXX.patch
    Applica la patch in una copia di lavoro, esegue i test, produce l'hash dell'output.

whycode opt bench --baseline --varianti v1,v2,v3 --case casi/log_grande
    Misura baseline e varianti con il protocollo (interleaving, warmup, mediana).

whycode opt decide --sessione s-XXXX
    Legge le misure registrate, applica i criteri (sezione 4.4) e scrive il verdetto.

whycode opt apply --patch patches/t-XXXX.patch
    Applica la patch solo se il verdetto e' ACCETTATO. Salva l'inverso per il rollback.

whycode opt rollback --tentativo t-XXXX
    Torna alla baseline in un comando.

whycode report render --sessione s-XXXX --md --json
    Genera il report markdown e il JSON dal registro.
```

## Appendice C: checklist di accettazione

Prima di dichiarare un'ottimizzazione accettata, tutto quanto segue deve essere vero:

- [ ] La baseline passa il 100% dei test prima di iniziare.
- [ ] La variante passa il 100% degli stessi test piu' i test di bordo.
- [ ] L'hash dell'output e' identico (o entro la tolleranza dichiarata per i float).
- [ ] La metrica obiettivo migliora oltre la soglia (default 5%).
- [ ] Il guadagno supera il rumore (differenza > 2 x MAD).
- [ ] Nessuna metrica peggiora oltre la tolleranza (sezione 7.2).
- [ ] La dispersione e' accettabile (MAD/mediana <= 5%).
- [ ] La sessione non ha il flag "deriva".
- [ ] Il budget del livello e' stato rispettato.
- [ ] Il record di registro e' scritto, completo e coerente.
- [ ] La patch e' salvata e il rollback e' possibile in un comando.
- [ ] A livello 3: la patch e' passata da revisione umana.

## Riferimenti

- PROGETTO.md di WhyCode (visione, Livello 4, regola d'oro).
- SuperCoder, COLM 2026, arXiv 2505.11480 (LLM come super-ottimizzatore, reward tutto o niente, Best-of-N, iterative refinement).
- SwiftTrans, ICML 2026, arXiv 2606.17683 (varianti multiple, selezione tra candidati, il problema dell'efficienza nelle traduzioni).
- TRACE, ACL 2026 (efficienza delle traduzioni, stress test, 23,5% di traduzioni corrette ma inefficienti).
- MLGO, arXiv 2101.04808 e documentazione LLVM (modelli al posto delle euristiche, inlining-for-size fino a -7%, separazione tra correttezza e ottimizzazione).
- Principio del collasso registrato: Livello 2 di WhyCode, disciplina del registro di WhyObliter.
