# WhyCode, Piano di Implementazione

Versione 1.0, 17/10/2026.
Questo documento trasforma la roadmap di `E:\Dev\WhyCode\PROGETTO.md` in un piano eseguibile.
Regola di lettura: tutto quello che sta qui e' verificabile con un comando o un numero.
Se una cosa non e' verificabile, non e' "fatto".

Lettura consigliata per un agente che parte domani mattina:
sezioni 2, 3, 4 (per capire cosa costruire), sezione 5 (in quale ordine), sezione 7 (la milestone), sezione 9 (come lavorare in parallelo).

---

## 1. Principi di ingegneria

Valgono per ogni riga di codice scritta in questo repo. Sono la versione operativa dei sei principi del PROGETTO.

1. **Test prima di dire fatto.** Nessun modulo si considera chiuso senza test automatici verdi. Nessuna traduzione si consegna senza essere stata eseguita. "Sembra giusto" non e' una prova.
2. **Reversibilita': tutto annullabile.** Ogni scrittura su file e' atomica (file temporaneo + rinomina). Prima di modificare un file di configurazione o una scheda esistente si fa una copia `.bak-<data>` (stessa abitudine di WhyLocalLM, es. `config.json.bak-s1`). Ogni operazione pesante ha il suo "annulla". Git locale attivo dalla F0: `git checkout -- .` riporta tutto indietro.
3. **Misura, non opinione.** Ogni affermazione di miglioramento (piu' veloce, piu' piccolo, piu' leggibile) richiede un numero registrato prima/dopo, nello stesso ambiente. Stessa disciplina di WhyObliter: registro, REPORT, stati OK/SALTATO/FALLITO, codici di uscita 0 (ok), 1 (almeno un fallito), 2 (errore di sintassi).
4. **Locale e privato.** Tutto gira sul PC di Whyed. Nessun servizio cloud obbligatorio, in nessun punto del flusso. Il motore di default e' WhyLocalLM su `http://127.0.0.1:1235`. Un modello frontier e' ammesso solo come maestro opzionale, mai come dipendenza.
5. **La conoscenza si accumula in locale.** Ogni linguaggio studiato lascia una scheda in `kb/`. Ogni scelta lascia una riga nel registro. Il sistema di domani sa piu' di quello di oggi, in modo visibile (numeri nel report).
6. **Il sistema non si blocca mai.** Se il modello locale non risponde, se la RAM e' poca, se un comando esterno manca: il percorso a regole pure prende il sopravvento e il lavoro continua. Un fallimento diventa uno stato SALTATO con motivo, mai un crash silenzioso.
7. **Start da pochissimo finto.** Per imparare un linguaggio vero (Python, JavaScript, C) si passa dallo stesso identico percorso dei mini linguaggi inventati. Se il percorso vale solo per i giocattoli, l'idea di WhyCode e' falsa e lo scopriamo subito.
8. **Un solo fatto nuovo per volta.** Dopo ogni modifica: `npm test` completo verde. Non si accumulano tre modifiche non testate "tanto poi provo".

---

## 2. Stack tecnico

### 2.1 Decisione: Node.js + TypeScript

Motivazione (perche' Node e non altro):

| Criterio | Node.js + TypeScript | Verdetto |
|---|---|---|
| Coerenza ecosistema | opencode, WhyLocalLM (`porta.mjs`, `decisore.mjs`), WhyObliter (`wo.js`), la lista lavori (`segna.js`) sono tutti Node | Node |
| Entrare nei loro moduli | `import` diretto dei loro file, stesso runtime, stessa config | Node |
| Parser di codice | `tree-sitter` ha binding Node ufficiali (pacchetto npm `tree-sitter`, v0.25.x, Node-API). Esiste anche `web-tree-sitter` (WASM) | Node |
| Test runner | `node --test` e' nativo, gia' usato in WhyObliter | Node |
| Nessuna toolchain extra | niente venv, niente pip, niente conflitti Python di sistema | Node |

Alternativa Python valutata e scartata. Motivi scritti per essere onesti:

- L'ecosistema di Whyed e' Node. Due runtime significano doppio setup, doppio debugging, doppio modo di fare le stesse cose.
- I binding Python di tree-sitter esistono e sono buoni, ma il guadagno reale sarebbe zero: il bind Node e' altrettanto ufficiale.
- La parte "esegui e verifica" ha comunque bisogno di Python come strumento esterno (per validare l'output Python). Python resta nel progetto come bersaglio di traduzione e come esecutore di test, non come linguaggio del sistema.

TypeScript e non JavaScript puro. Motivi: i formati di WhyCode (modello di comprensione, schede, registro) sono strutture dati con campi fissi, e il tipo e' il primo test. `tsc` in modalita' strict blocca classi intere di errori prima che diventino bug. Il costo e' un passaggio di compilazione, accettabile.

### 2.2 Versioni e strumenti

- **Node.js**: versione 22 LTS o superiore (stessa famiglia gia' installata per WhyLocalLM). Verifica con `node -v`.
- **TypeScript**: ultima 5.x come devDependency. Compilazione con `tsc`, output in `build/`. Nessun bundler.
- **Moduli ESM** (`"type": "module"`), target ES2022, `moduleResolution: NodeNext`.
- **Editor**: qualunque. La verifica vera e' `npm test`, non l'editor.

### 2.3 Dipendenze (elenco chiuso, si allarga solo con decisione scritta)

Runtime:

| Pacchetto | A cosa serve | Nota |
|---|---|---|
| `web-tree-sitter` | parsing dei linguaggi noti (Python, JavaScript) | WASM, nessuna compilazione C++ su Windows. Scelto al posto del binding nativo per robustezza: il nativo `tree-sitter` ha avuto rilasci npm con prebuild mancanti (issue node-tree-sitter #256, agosto 2025) e su Windows senza toolchain C++ non si compila |
| `tree-sitter-python`, `tree-sitter-javascript` | grammatiche pronte | si usano i `.wasm` generati con `npx tree-sitter build --wasm` (dalla CLI tree-sitter, che da v0.26 scarica da sola il wasi-sdk) |
| `zod` | validare schede, registro, modello di comprensione | gia' presente in altri progetti dell'ecosistema |

Dev:

| Pacchetto | A cosa serve |
|---|---|
| `typescript` | compilazione e typecheck |
| `@types/node` | tipi Node |
| `fast-check` | test property-based (sezione 4, modulo verifica) |

Niente altro. Niente framework web, niente ORM, niente bundler, niente LLM SDK (il client del motore e' `fetch` verso `127.0.0.1:1235`, venti righe).

Se la F1 mostra che il parsing WASM e' troppo lento sui casi d'uso reali (misurato, non stimato), si valuta il passaggio al binding nativo `tree-sitter` con misure a supporto. Decisione rimandata, non presa ora.

### 2.4 Storage

- **File JSON e JSONL**, niente database all'inizio.
- Schede e formati: JSON (leggibile, diffabile, validato con zod).
- Registro dei collassi, log di esecuzione, diario: JSONL (una riga per evento, append puro, mai riscrittura).
- **SQLite solo se e quando serve**: soglia dichiarata adesso per non discuterne di nuovo a caldo. Si passa a SQLite quando il registro dei collassi supera 20.000 righe e una query tipica (trova tutti i collassi di un linguaggio) prende piu' di 2 secondi con lo scan lineare attuale. Fino a quel momento: JSONL.
- Scritture: sempre atomiche, file temporaneo nella stessa cartella + `Rename-Item`. Su Windows `Move-Item -Force` dopo il rename del temp.

### 2.5 Gestione dipendenze

- `package-lock.json` versionato. Install con `npm ci` quando esiste il lock.
- Le grammatiche WASM scaricate una volta finiscono in `vendor/tree-sitter/` nel repo: dopo il setup iniziale il progetto funziona anche senza internet.
- Aggiornamenti: solo a fase chiusa, mai a meta' di un lavoro, sempre con `npm test` completo prima e dopo.

---

## 3. Struttura del repo

Radice: `E:\Dev\WhyCode`

```
E:\Dev\WhyCode
├── PROGETTO.md                  (esiste, la visione)
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
├── .gitattributes
├── docs\
│   ├── PIANO-IMPLEMENTAZIONE.md (questo documento)
│   ├── FORMATI.md               (schemi di scheda, registro, comprensione: scritti in F0)
│   ├── SPEC-01-KERNEL.md        (grammatica del kernel: scritta in F0)
│   └── registri\                (copie dei REPORT delle fasi)
├── src\
│   ├── condivisi\               (tipi, errori, json atomico, hash, tempo, validatori zod)
│   ├── kernel\                  (tokenizer, parser, AST, pretty-print, valutatore)
│   ├── comprensione\            (tree-sitter, inferenza grammatica, UAST, modello, rumore)
│   ├── quantico\                (varianti, vincoli, collasso, registro)
│   ├── sintesi\                 (generatore, stile ospite, interop)
│   ├── verifica\                (esecutore, test-runner, proprieta)
│   ├── ottimizzazione\          (benchmark, regole, report)
│   ├── memoria\                 (schede, indice, apprendimento)
│   └── motore\                  (cliente WhyLocalLM, prompt, GBNF)
├── tests\
│   ├── unit\                    (un file .test.ts per file di src, stesso nome)
│   ├── integrazione\            (due o piu' moduli insieme)
│   ├── e2e\                     (flussi interi, inclusa la prova di terra)
│   ├── golden\                  (coppie input/atteso, verificate come wo.js)
│   └── fixtures\                (materiale di prova: mini linguaggi, frasi rumorose, repo ospiti finti)
├── tools\
│   ├── whycode.ts               (CLI unica: studia, capisci, traduci, collassa, replay, report, memoria)
│   ├── golden.ts                (verifica e aggiorna i golden, aggiorna solo con --conferma)
│   ├── bench.ts                 (benchmark before/after)
│   └── prova-terra.ts           (orchestra la milestone della sezione 7)
├── scripts\
│   ├── setup.ps1                (controlla Node, npm ci, build wasm, crea cartelle)
│   ├── prova.ps1                (build + test + report in un comando)
│   └── stato.ps1                (mostra: test verdi/rossi, ultime righe registro, spazio disco)
├── kb\
│   ├── indice.json              (elenco linguaggi studiati con data e stato)
│   ├── linguaggi\
│   │   └── <lingua>\scheda.json, idiomi.md, trappole.md, esempi\
│   └── frasi\                   (frasi umane rumorose di riferimento, per il test di robustezza)
├── esempi\
│   ├── mini-linguaggi\          (i linguaggi inventati per le prove, es. zeta\)
│   ├── repos-ospiti\            (repo finti con stile definito, per la prova di incastro)
│   └── intenti\                 (intenti di riferimento in formato WhyCode)
├── registro\
│   ├── collassi\collassi.jsonl  (una riga per scelta, immutabile)
│   └── prove\prove.jsonl        (una riga per esecuzione: cosa, esito, durata, verdetto)
├── log\                         (log di sessione, errori, output dei comandi esterni)
├── vendor\tree-sitter\          (i .wasm delle grammatiche, offline dopo il setup)
├── temp\esecuzione\             (cartelle di lavoro del modulo verifica, svuotate a ogni run)
└── build\                       (output di tsc, non si versiona)
```

Descrizione delle cartelle principali:

- `src\condivisi`: il minimo comune. `tipi.ts` (interfacce di tutti i formati), `json.ts` (lettura/scrittura atomica), `hash.ts` (sha256 stabile), `errori.ts` (errore tipizzato con causa), `tempo.ts` (ora ISO, durate). Qui non si importa niente dagli altri moduli: e' la base.
- `src\kernel`: il linguaggio vero di WhyCode. Piccolo, stabile, senza nomi di linguaggi specifici dentro.
- `src\comprensione`: tutto quello che trasforma "roba scritta" in modello capito.
- `src\quantico`: il cuore originale. Spazio delle varianti, vincoli, collasso deterministico, registro.
- `src\sintesi`: dal modello al codice nel linguaggio bersaglio, compreso l'incastro nello stile ospite.
- `src\verifica`: la rete di sicurezza. Esegue, testa, misura, decide se si puo' dire "fatto".
- `src\ottimizzazione`: solo con misura. Mai "sembra piu' veloce".
- `src\memoria`: la crescita. Schede, indice, cosa si e' imparato e riuso.
- `src\motore`: l'unica porta verso il modello locale. Se il modello un giorno sparisce, si tocca solo questa cartella.

Regole di confine (importanti per il lavoro multi-agente):

- `condivisi` non importa da altri moduli.
- `kernel` non importa da nessuno tranne `condivisi`.
- `comprensione` importa `condivisi` e `motore`. Mai `sintesi`.
- `quantico` importa `condivisi` e `memoria` (per leggere le schede).
- `sintesi` importa `condivisi`, `quantico`, `memoria`, `motore`.
- `verifica` importa `condivisi` soltanto. E' indipendente apposta: deve poter provare qualunque cosa.
- `ottimizzazione` importa `condivisi` e `verifica`.
- Nessun import circolare. Se serve, si sposta il tipo in `condivisi`.

---

## 4. Moduli: responsabilita', API, test

Per ogni modulo: cosa fa, quali tipi scambia, da cosa dipende, primi test da scrivere.
Le firme sono indicate in TypeScript semplificato per fissare il contratto. Il nome esatto dei parametri lo decide chi implementa, i tipi no.

### 4.1 `src\condivisi` (fondamenta, si scrive in F0 e si tocca il meno possibile)

- **Responsabilita'**: tipi di tutti i formati, I/O JSON atomico, hash stabili, errori tipizzati, ora.
- **API**:
  - `leggiJson<T>(percorso: string, schema: ZodType<T>): T` (errore chiaro se manca o non valida)
  - `scriviJsonAtomico(percorso: string, dati: unknown): void` (temp + rename, backup `.bak-<data>` se esiste)
  - `aggiungiRigaJsonl(percorso: string, dati: unknown): void` (append con lock di processo)
  - `sha256(testo: string): string`
  - `ErroreWhyCode` (codice, messaggio, causa, rimediabile si/no)
- **Dipendenze**: zod.
- **Primi test**: scrittura atomica non lascia file a meta' se il processo muore (simulato); backup creato una volta sola; hash identico su stesse stringhe in run diverse; schema invalido produce errore con campo colpevole.

### 4.2 `src\kernel` (il linguaggio di WhyCode)

- **Responsabilita'**: tokenizzare, parsare, stampare e valutare la grammatica del kernel. La bozza della grammatica sta in `docs\SPEC-01-KERNEL.md` (decisione F0, bozza in appendice B di questo documento).
- **Input**: testo WhyCode. **Output**: AST tipizzato.
- **API**:
  - `parse(fonte: string): Esito<Kernel>` (con posizione degli errori, riga e colonna)
  - `stampa(ast: Kernel): string` (pretty-print stabile: parse(stampa(parse(x))) === parse(x))
  - `valuta(ast: Kernel, contesto: Contesto): Intento` (trasforma l'AST nel modello di intento usato dai livelli sopra)
- **Dipendenze**: `condivisi` soltanto. Zero modello, zero rete.
- **Primi test**: parsing di 40 file `.why` di prova; errore con riga e colonna su 10 input rotti; roundtrip parse/stampa su 20 file; un file con soli commenti; un file vuoto.

### 4.3 `src\comprensione` (studiare al momento)

Sotto-moduli e responsabilita':

- **`tree-sitter.ts`**: parsing dei linguaggi noti. Carica i `.wasm` da `vendor/`. Input: fonte + nome linguaggio. Output: albero tree-sitter + elenco nodi con errori.
- **`inferenza-grammatica.ts`**: il ciclo Kajal semplificato. Input: esempi positivi e negativi. Output: una BNF candidata + parser generato + report delle iterazioni. Il ciclo: il modello propone una BNF, il parser la prova sugli esempi, gli errori esatti tornano al modello, si corregge. Massimo 8 iterazioni, poi SALTATO con motivo.
- **`uast.ts`**: normalizzazione ad albero universale. 15 etichette iniziali (decisione F0, elenco in sezione 12): `funzione`, `chiamata`, `assegnazione`, `dichiarazione`, `ciclo`, `condizione`, `ritorno`, `import`, `effetto` (I/O), `errore`, `tipo`, `dato`, `blocco`, `commento`, `ignoto`. Gli attributi specifici del linguaggio si conservano accanto, mai si buttano.
- **`modello.ts`**: costruisce e valida il Modello di Comprensione (schema in `docs\FORMATI.md`).
- **`rumore.ts`**: ripulitura di input umani scritti male: normalizza spazi, corregge typo frequenti con una tabella in `kb\frasi\`, non inventa, e se non capisce lo dice (`incertezze` nel modello).
- **API principale**:
  - `comprendi(fonte: string, opzioni: { lingua?: string }): Promise<Comprensione>`
  - `inferisciGrammatica(esempi: Esempio[], negative: Esempio[]): Promise<Esito<GrammaticaInferita>>`
  - `aUast(rappresentazione: unknown): Uast`
  - `pulisciRumore(testo: string): { testo: string, correzioni: string[], incertezze: string[] }`
- **Dipendenze**: `condivisi`, `motore` (solo per l'inferenza grammatica e la semantica; il parsing tree-sitter funziona senza modello).
- **Primi test**: parse di 3 file Python veri senza errori; UAST con etichette giuste su 20 costrutti; inferenza su un mini linguaggio di prova (L1, vedi esempi) in meno di 8 iterazioni; `pulisciRumore` su 20 frasi con typo nota il typo e non cambia il significato.

### 4.4 `src\quantico` (il cuore)

- **`varianti.ts`**: genera N realizzazioni possibili per un intento. Le prime varianti a F3 sono template piu' riempimenti guidati dal modello con GBNF; a regime, idiomi presi dalle schede.
- **`vincoli.ts`**: definisce e applica i vincoli (linguaggio di uscita, stile ospite, test forniti, limiti di memoria, piattaforma). Un vincolo o elimina una variante o la penalizza, mai la premia senza motivo scritto.
- **`collasso.ts`**: la scelta. Funzione deterministica: `sha256(intento + vincoli normalizzati + contesto + versione_regole)` guida l'ordine di valutazione; a parita' di punteggio vince la variante con id minore. Ordine dei criteri: prima correttezza (test verdi), poi incastro (conformita' stile), poi prestazioni (benchmark), poi stile. Correttezza non negoziabile.
- **`registro.ts`**: scrittura e lettura immutabile di `registro\collassi\collassi.jsonl`. Fornisce `replay(id)`.
- **API**:
  - `generaVarianti(intento: Intento, spazio: Spazio, quante: number): Promise<Variante[]>`
  - `applicaVincoli(varianti: Variante[], vincoli: Vincolo[]): { restano: Variante[], scartate: Scartata[] }` (motivo per ogni scarto)
  - `collassa(candidati: Valutata[], contesto: string, versioneRegole: string): Collasso`
  - `replay(id: string): Collasso` (ricostruisce leggendo il registro e le fonti citate)
- **Dipendenze**: `condivisi`, `memoria`.
- **Primi test (i piu' importanti del progetto)**: determinismo su 100 ripetizioni (stesso input, stesso id, stessa scelta); replay identico su 50 collassi; un vincolo nuovo cambia la scelta solo quando deve (scenario costruito ad hoc); il registro non si riscrive mai (append only, test che tenta di troncare e fallisce).

### 4.5 `src\sintesi` (comporre e incastrare)

- **`generatore.ts`**: data la variante scelta e la scheda del linguaggio, produce il codice finale. Usa il modello con GBNF (grammatica del linguaggio bersaglio in forma ridotta) e poi un passaggio di riparazione guidata dagli errori del parser/compilatore, massimo 5 giri.
- **`stile-ospite.ts`**: legge il repo ospite e produce una fotografia di stile: indentazione, virgolette, lunghezza righe, convenzioni di nomi (snake_case, camelCase), import, test runner presente, errori comuni nel repo. Output: oggetto stile misurabile.
- **`interop.ts`**: F4. Per una coppia di linguaggi scegle il meccanismo: 1) processo separato con scambio JSON su stdin/stdout (sempre possibile), 2) FFI della piattaforma (solo se i tipi lo permettono). Genera il binding e un test di andata e ritorno.
- **API**:
  - `sintetizza(intento: Intento, variante: Variante, scheda: SchedaLingua, stile?: Stile): Promise<Esito<Codice>>`
  - `leggiStile(cartella: string): Promise<Stile>`
  - `binding(da: string, a: string, firma: Firma): Promise<Esito<Codice>>`
- **Dipendenze**: `condivisi`, `quantico`, `memoria`, `motore`.
- **Primi test**: 30 intenti di partenza tradotti in Python (compilano e passano i test forniti); stile letto da 3 repo finti e rispettato in almeno 9 casi su 10; un ciclo di riparazione chiude un errore sintattico costruito ad hoc.

### 4.6 `src\verifica` (la rete di sicurezza)

- **`esecutore.ts`**: esegue codice in `temp\esecuzione\<id>\` con timeout (default 10s), senza rete, con guardia RAM (se `os.freemem() < 1 GB`, SALTATO con motivo, come fa `benchmark_model` di WhyObliter sotto 3 GB). Interprete ammesso solo se presente in una lista bianca nel file `config\esecutori.json` (`python`, `node`, `gcc`, `clang`). Ogni esecuzione scrive una riga in `registro\prove\.jsonl`.
- **`test-runner.ts`**: lancia i test forniti (Python: `python -m pytest` se presente, altrimenti `python file_test.py`; Node: `node --test`). Racconta: passati, falliti, errore, durata.
- **`proprieta.ts`**: property-based con `fast-check`. Esempio per la traduzione: "per ogni lista di interi, l'output Python deve dare lo stesso risultato della semantica dichiarata nell'intento", su 100 casi generati.
- **API**:
  - `esegui(comando: string, cartella: string, opzioni?: { timeoutMs?: number }): Promise<EsitoEsecuzione>`
  - `testa(codice: Codice, test: string, linguaggio: string): Promise<EsitoVerifica>`
  - `verificaProprieta(spec: SpecProprieta, quante: number): Promise<EsitoVerifica>`
- **Dipendenze**: `condivisi` soltanto.
- **Primi test**: timeout rispettato (processo lanciato e ucciso dopo 2s); RAM bassa simulata produce SALTATO; comando non in lista bianca rifiutato; ogni esecuzione lascia una riga nel registro.

### 4.7 `src\ottimizzazione`

- **`benchmark.ts`**: misura tempo e memoria di un programma su un caso. N misure (default 5), mediana, prima e dopo. Stesso PC, stesso interprete, stesso carico: se la macchina ha processi pesanti attivi (motore LLM acceso), il report lo dice.
- **`regole.ts`**: catalogo di trasformazioni con precondizioni e misura obbligatoria. Prima regola scritta a mano in F5: "sostituisci concatenazione di stringhe in ciclo con join". Una regola senza misura non entra nel catalogo.
- **`report.ts`**: REPORT in markdown con stati OK/SALTATO/FALLITO per ogni misura, come `wo.js`.
- **API**:
  - `misura(programma: Codice, caso: Caso): Promise<Numero>`
  - `applica(codice: Codice, regola: Regola): { proposto: Codice, guadagnoStimato: string }`
  - `reportPrimaDopo(prima: Numero, dopo: Numero): string`
- **Dipendenze**: `condivisi`, `verifica`.
- **Primi test**: mediana su misure finte; report con stato FALLITO se dopo e' peggio del 5%; rifiuto di regola senza precondizione soddisfatta.

### 4.8 `src\memoria`

- **`schede.ts`**: carica, valida, aggiorna le schede linguaggio (`kb\linguaggi\<nome>\scheda.json`). Aggiornamento sempre con backup e con storico in `scheda.storico.jsonl`.
- **`indice.ts`**: mantiene `kb\indice.json`. Prima di studiare un linguaggio nuovo, cerca se esiste qualcosa di simile (per esempi o per nome) e lo propone come punto di partenza.
- **`apprendimento.ts`**: a fine studio, trasforma il lavoro in scheda: grammatica, idiomi, trappole, esempi, numeri delle prove. E' il pezzo che rende vera la frase "ogni volta piu' resistente".
- **API**:
  - `caricaScheda(lingua: string): SchedaLingua | null`
  - `salvaScheda(scheda: SchedaLingua): void`
  - `cercaSimili(caratteristiche: string[]): SchedaLingua[]`
  - `impara(comprensione: Comprensione, numeri: Numero[]): SchedaLingua`
- **Dipendenze**: `condivisi`.
- **Primi test**: ciclo salva/carica identico; storico cresce senza toccare la scheda corrente; `cercaSimili` trova il linguaggio giusto su 5 casi costruiti.

### 4.9 `src\motore` (una sola porta verso l'AI locale)

- **`cliente.ts`**: client OpenAI-compatibile verso WhyLocalLM: `http://127.0.0.1:1235/v1/chat/completions`. Modelli: `why-veloce` (default per i passi meccanici), `why-potente` (solo quando serve capire o progettare). Mai cloud. Timeout default 120s. Retry 2 con attesa 2s. Prima di ogni chiamata: health check su `/health` con timeout 2s; se non risponde, si passa al percorso a regole e si registra SALTATO.
- **`prompt.ts`**: i prompt vivono in file dentro `src\motore\prompt\` (uno per compito: `inferisci-grammatica.md`, `estrai-semantica.md`, `genera-codice.md`, `ripara-errore.md`). Italiano semplice, esempi dentro, nessuna catena di richieste improvvisata nel codice.
- **`gbnf.ts`**: compilazione e gestione delle grammatiche vincolate. llama.cpp accetta il campo `grammar` (formato GBNF) direttamente su `/v1/chat/completions`, e accetta `response_format` con JSON Schema che viene convertito in GBNF dal server. Regola dura: quando si usa `grammar` si forza `chat_template_kwargs: { enable_thinking: false }` e si usa `why-veloce`. Motivo: sui modelli thinking la grammatica interferisce con il blocco di ragionamento (bug noto upstream con Qwen3.x, "grammar leaks into reasoning_content"), e il risultato va in loop. Senza thinking il vincolo funziona bene.
- **API**:
  - `chiedi(messaggi: Messaggio[], opzioni?: Opzioni): Promise<string>` (opzioni: modello, grammar, jsonSchema, maxTokens, timeoutMs, temperatura)
  - `chiediJson<T>(messaggi: Messaggio[], schema: ZodType<T>): Promise<T>` (jsonSchema passato al server + validazione locale come doppia rete)
  - `disponibile(): Promise<boolean>`
- **Dipendenze**: `condivisi` soltanto.
- **Primi test (senza modello acceso, con server finto)**: timeout rispettato; health check fallito produce errore `MotoreSpento` non fatale; JSON non valido dal modello viene respinto e ritentato una volta; il body contiene `enable_thinking: false` quando c'e' un grammar.

---

## 5. Fasi F0-F5

Per ogni fase: obiettivo, deliverable, criteri di accettazione numerici, test obbligatori, cosa NON fare.

### F0, Fondamenta (nessun modello richiesto)

**Obiettivo**: scheletro vero, formati decisi, kernel parsabile e stampabile, registro che parte.

**Deliverable**:
1. Repo con struttura sezione 3, `git init`, primo commit locale.
2. `package.json`, `tsconfig.json`, `npm test` funzionante (anche con pochi test).
3. `src\condivisi` completo (sezione 4.1).
4. `src\kernel` completo (parser, stampa, valutazione) con `docs\KERNEL.md` approvato.
5. `docs\FORMATI.md` con i tre schemi: Scheda Linguaggio, Modello di Comprensione, riga di Registro Collasso (bozze in appendice A).
6. `src\memoria\schede.ts` e `indice.ts` minimi, con un linguaggio finto caricato e riletto.
7. `src\motore\cliente.ts` con server finto nei test.
8. `tools\whycode.ts` con almeno: `--versione`, `memoria vedi`, `report test`.
9. `scripts\setup.ps1`, `scripts\prova.ps1`, `scripts\stato.ps1`.

**Criteri di accettazione (numeri)**:
- `npm test` verde con almeno 60 test, 0 falliti.
- Parser kernel: parse corretto su 40 file `.why`, errore con riga e colonna su 10 file rotti.
- Roundtrip parse/stampa stabile su 20 file (test golden).
- Zero chiamate di rete in tutti i test della F0.
- `node -e "..."` di prova: con il motore spento, `tools\whycode.ts memoria vedi` funziona lo stesso (il sistema non si blocca).

**Test obbligatori**: unit di condivisi e kernel (sezione 4), golden dei 20 roundtrip, integrazione memoria+schede, fumo del client motore con server finto.

**NON fare in F0**: tree-sitter, chiamate al modello vero, traduzione, varianti, ottimizzazione. Niente "intanto aggiungiamo". La F0 e' corta apposta.

### F1, Comprensione

**Obiettivo**: capire codice vero (Python, JavaScript) e capire linguaggi inventati da esempi. Capire frasi umane scritte male.

**Deliverable**:
1. `src\comprensione\tree-sitter.ts` con Python e JavaScript (WASM in `vendor\`).
2. `src\comprensione\inferenza-grammatica.ts` con ciclo di correzione (max 8 giri).
3. `src\comprensione\uast.ts` con le 15 etichette.
4. `src\comprensione\modello.ts` con lo schema validato.
5. `src\comprensione\rumore.ts` con la tabella correzioni in `kb\frasi\`.
6. 3 mini linguaggi in `esempi\mini-linguaggi\`: L1 (righe semplici), L2 (blocchi e condizioni), L3 (funzioni e annidamenti). Ognuno con 30 esempi positivi e 20 negativi.
7. 60 frasi umane rumorose in `kb\frasi\` (30 italiano, 30 inglese, con typo, punteggiatura sbagliata, parole attaccate).

**Criteri di accettazione (numeri)**:
- Python e JavaScript: parse senza errori su almeno il 95% di 40 file veri (20 per linguaggio) estratti a mano.
- UAST: almeno 90% di etichette corrette su un set di 60 costrutti etichettati a mano.
- Inferenza grammatica per L1, L2, L3: accetta il 100% degli esempi positivi, rifiuta almeno il 95% dei negativi, in al massimo 8 iterazioni ognuno.
- Frasi rumorose: intento estratto corretto su almeno 48 su 60 (80%). Il report elenca le 12 o meno sbagliate.
- Ogni comprensione produce un Modello di Comprensione valido secondo zod, su 100% dei casi.

**Test obbligatori**: unit per ogni sotto-modulo; integrazione "esempi, grammatica inferita, parser, UAST"; e2e capisci su 10 frasi; golden per UAST di 10 file.

**NON fare in F1**: tradurre, generare codice, ottimizzare. La F1 produce solo comprensione. Se il modello locale e' lento, si riduce il numero di casi, non la qualita' dei criteri.

### F2, Sintesi e incastro

**Obiettivo**: da intento capito a codice Python, JavaScript e C che compila, passa i test e si incastra nello stile ospite.

**Deliverable**:
1. `src\sintesi\generatore.ts` con GBNF e ciclo di riparazione (max 5 giri).
2. `src\sintesi\stile-ospite.ts`.
3. `src\verifica\esecutore.ts`, `test-runner.ts`.
4. 30 intenti di riferimento in `esempi\intenti\`, ognuno con test forniti per Python, JavaScript e C (dove ha senso: C per 10 dei 30).
5. 3 repo ospiti finti in `esempi\repos-ospiti\` con stili diversi e un file `STILE-ATTESO.md` scritto a mano (la verita' per la misura).

**Criteri di accettazione (numeri)**:
- Python: su 30 intenti, almeno 27 (90%) compilano (`python -m py_compile`) e almeno 24 (80%) passano i test forniti.
- JavaScript: stesse soglie su 30 (`node --check`).
- C: su 10 intenti, almeno 8 compilano con `gcc -std=c11 -Wall` (o `clang`) e almeno 7 passano i test.
- Incastro: conformita' a `STILE-ATTESO.md` almeno 90% per repo (misurata da un piccolo verificatore di stile, non a occhio).
- Nessuna consegna senza riga di verifica in `registro\prove\.jsonl`.

**Test obbligatori**: unit generatore (con server finto che restituisce codice buono, codice con un errore, codice irrecuperabile); integrazione intento, variante singola, sintesi, verifica; e2e 5 intenti completi per Python.

**NON fare in F2**: varianti multiple (arrivano in F3), ottimizzazione (F5), interop (F4). Ogni intento ha UNA variante in questa fase.

### F3, Spazio quantico

**Obiettivo**: la parte originale. N varianti per intento, collasso deterministico registrato, replay verificabile.

**Deliverable**:
1. `src\quantico\varianti.ts`, `vincoli.ts`, `collasso.ts`, `registro.ts`.
2. Comando `tools\whycode.ts collassa <intento>` e `tools\whycode.ts replay <id>`.
3. 20 intenti di riferimento con almeno 2 vincoli ciascuno (stile, libreria, limite).

**Criteri di accettazione (numeri)**:
- Almeno 3 varianti generate per intento su 20 su 20.
- Determinismo: 100 collassi ripetuti sullo stesso input producono 100 scelte identiche (stesso id variante, stesso hash).
- Replay: 50 collassi rieseguiti da registro danno risultato identico al 100%.
- Il registro non si corrompe con 2 processi che scrivono insieme (test di concorrenza con 2 processi).
- Un vincolo nuovo elimina o penalizza varianti solo con motivo scritto (100% delle righe del registro hanno campo motivo non vuoto).

**Test obbligatori**: unit per ogni sotto-modulo; il test determinismo e il test replay sono obbligatori a ogni `npm test` (non solo la prima volta); integrazione intento, varianti, collasso, verifica.

**NON fare in F3**: migliorare la qualita' del codice generato (e' F2 e F5), nuove lingue target.

### F4, Interop

**Obiettivo**: due linguaggi che si parlano senza riscrittura. Logica 2n: due meccanismi per coppia, non una soluzione per ogni combinazione.

**Deliverable**:
1. `src\sintesi\interop.ts`.
2. Meccanismo 1 (sempre possibile): processo separato, scambio JSON su stdin/stdout, con test di andata e ritorno.
3. Meccanismo 2 (dove i tipi lo permettono): FFI C.
4. Coppie di partenza: Python+JavaScript, Python+C.

**Criteri di accettazione (numeri)**:
- Per ogni coppia e per ogni meccanismo implementato: un test end-to-end che chiama davvero la funzione nell'altro linguaggio e verifica il risultato, 4 test su 4 verdi.
- Nessun binding generato senza test eseguito.
- Il binding generato si incastra nello stile del repo ospite (stesso criterio F2, 90%).

**Test obbligatori**: e2e per coppia e meccanismo; unit per la scelta del meccanismo (dati i tipi, scegli il piu' semplice che funziona).

**NON fare in F4**: supportare 5 linguaggi insieme. Due coppie, fatte bene.

### F5, Ottimizzazione e memoria cumulativa

**Obiettivo**: il "notevole" misurato, e la KB che cresce da sola.

**Deliverable**:
1. `src\ottimizzazione\benchmark.ts`, `regole.ts`, `report.ts`.
2. Comando `tools\whycode.ts report ottimizza <task>`.
3. `src\memoria\apprendimento.ts` completo: a fine studio di ogni linguaggio, scheda scritta da sola.
4. 10 task di benchmark in `esempi\` con numeri di riferimento.

**Criteri di accettazione (numeri)**:
- Su 10 task: almeno 7 mostrano un miglioramento misurato (tempo mediano almeno -15% oppure dimensione output almeno -10%), sempre con correttezza mantenuta al 100% (tutti i test verdi prima e dopo).
- Ogni numero nel report e' accompagnato da: comando usato, 5 misure, mediana, data, carico della macchina (motore acceso o spento).
- Effetto memoria: la seconda comprensione di un linguaggio della stessa famiglia richiede almeno il 30% di token generati in meno della prima (contatore nel diario del motore o nel registro), misurato su 3 coppie.
- Le schede di Python, JavaScript e C esistono, sono valide e citano almeno 5 idiomi e 3 trappole ciascuna.

**Test obbligatori**: unit benchmark (mediane, outlier, rifiuto misure con carico sporco); test che una regola senza guadagno misurato venga scartata; e2e: studio, scheda, secondo studio piu' veloce (con numeri nel report).

**NON fare in F5**: ottimizzazione senza numero; regole speculative; toccare il kernel (e' stabile da F0).

---

## 6. Strategia di test

### 6.1 Livelli

1. **Unit** (`tests\unit\`): un file per file di sorgente, stesso nome (`parser.ts` -> `parser.test.ts`). Veloci, senza rete, senza modello, senza disco fuori da `temp\`.
2. **Integrazione** (`tests\integrazione\`): due o piu' moduli veri insieme, con server motore finto (un mini HTTP server locale nei test che risponde JSON preparati).
3. **End-to-end** (`tests\e2e\`): flussi interi via CLI (`tools\whycode.ts`), incluso il percorso con modello vero quando e' acceso. Se il modello e' spento: questi test si marcano SALTATO con motivo, non falliscono.
4. **Golden** (`tests\golden\`): coppie input/atteso per parser kernel, UAST, pretty-print, report. Verifica con `npm run golden:verifica`. Aggiornamento solo con `npm run golden:aggiorna -- --conferma` e il diff va letto riga per riga prima di confermare (stessa disciplina del `--conferma` di `wo.js`).
5. **Benchmark** (`tools\bench.ts`): fuori da `npm test`, si lancia a mano. I numeri finiscono in `registro\prove\`.
6. **Property-based**: con `fast-check` per cose con regole universali: determinismo del collasso, roundtrip parse/stampa, semantica delle traduzioni.

### 6.2 Regole di esecuzione su Windows (PowerShell)

- Il glob dei test lo risolve Node tra virgolette doppie: `node --test "build/tests/**/*.test.js"`.
- Nessun test usa internet.
- Nessun test scrive fuori da `E:\Dev\WhyCode\temp\` e `E:\Dev\WhyCode\registro\prove\` (percorsi iniettati da variabile d'ambiente nei test, cosi' il test runner non tocca mai dati veri).
- I test che lanciano `python`, `node`, `gcc` controllano prima che il comando esista (`Get-Command python -ErrorAction SilentlyContinue`); se manca: SALTATO con motivo.
- Ordine: `npm run build` prima sempre. Test sul JavaScript compilato, mai su loader sperimentali.

### 6.3 Script npm previsti

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "npm run build && node --test \"build/tests/**/*.test.js\"",
    "test:unit": "npm run build && node --test \"build/tests/unit/**/*.test.js\"",
    "test:integrazione": "npm run build && node --test \"build/tests/integrazione/**/*.test.js\"",
    "test:e2e": "npm run build && node --test \"build/tests/e2e/**/*.test.js\"",
    "golden:verifica": "node build/tools/golden.js verifica",
    "golden:aggiorna": "node build/tools/golden.js aggiorna",
    "bench": "node build/tools/bench.js",
    "prova:terra": "node build/tools/prova-terra.js",
    "stato": "powershell -File scripts\\stato.ps1"
  }
}
```

Comandi tipici in PowerShell:

```powershell
cd E:\Dev\WhyCode
npm ci
npm test
npm run golden:verifica
powershell -File scripts\stato.ps1
```

### 6.4 Regola del REPORT (coerenza con WhyObliter)

Ogni comando di `tools\whycode.ts` che fa piu' passi produce un REPORT con una riga per passo: stato `OK`, `SALTATO`, `FALLITO`, motivo, durata. Codice di uscita: 0 tutto ok, 1 almeno un FALLITO, 2 errore di sintassi del comando. Un FALLITO non ferma i passi successivi indipendenti. Va' da se': il REPORT e' scritto in italiano semplice, senza emoji.

---

## 7. Prima prova a terra (la milestone)

Definizione dal PROGETTO:

> **Un mini linguaggio inventato al momento, mai visto prima, descritto solo da esempi, viene capito e riscritto in Python che passa i test. Poi una frase scritta male in due lingue umane viene capita lo stesso.**

Chi la orchestra: `node build/tools/prova-terra.js` (dopo `npm run build`).
Regola anti-imbroglio: il mini linguaggio "Zeta" lo inventa una persona o un agente diverso da chi sviluppa, e 5 esempi di verifica restano chiusi in `tests\fixtures\zeta-nascosto\` fino al passo 6. Chi sviluppa non li guarda.

### Passi numerati

**Passo 0. Preparare il PC** (una volta sola).
Comandi:

```powershell
node -v            # serve >= 22
npm ci             # in E:\Dev\WhyCode
powershell -File scripts\setup.ps1   # controlla Node, prepara vendor\, temp\, registro\
```

Successo: `setup.ps1` finisce con "PRONTO", nessun errore rosso.

**Passo 1. F0 e F1 chiusi.**
Comando: `npm test`.
Successo: tutti i test verdi, inclusi i test di determinismo del registro (parte del collasso arriva in F3, ma il registro si testa da F0).

**Passo 2. Il mini linguaggio Zeta esiste e nessuno lo conosce.**
Chi non sviluppa scrive `esempi\mini-linguaggi\zeta\` con:
- 10 esempi positivi (`1.zeta` ... `10.zeta`),
- 5 esempi negativi (`neg-1.zeta` ... con errori apposta),
- 5 esempi nascosti in `tests\fixtures\zeta-nascosto\`,
- per 5 dei 10 esempi, l'equivalente Python atteso con test (`test\1_test.py` eccetera).
Successo: la cartella esiste, il contenuto non e' mai finito in nessun prompt del motore.

**Passo 3. Studio a freddo.**
Comando: `node build\tools\whycode.js studia esempi\mini-linguaggi\zeta`.
Cosa succede: inferenza grammatica (F1), massimo 8 iterazioni, poi scheda in `kb\linguaggi\zeta\`.
Successo: REPORT con stato OK; il parser inferito accetta 10/10 esempi positivi e rifiuta almeno 4/5 negativi; la scheda e' scritta e valida.

**Passo 4. Controllo su esempi nascosti.**
Comando: `node build\tools\whycode.js studia esempi\mini-linguaggi\zeta --verifica-nascosti tests\fixtures\zeta-nascosto`.
Successo: almeno 4 su 5 esempi nascosti parsati correttamente e descritti nella comprensione. Se no: si registra FALLITO con i dettagli, e si torna al passo 3 con piu' esempi (l'inferenza impara, allora il sistema funziona come promesso).

**Passo 5. Comprensione semantica.**
Comando: `node build\tools\whycode.js capisci esempi\mini-linguaggi\zeta\3.zeta`.
Qui entra il motore (why-potente), con JSON vincolato GBNF.
Successo: il Modello di Comprensione dice, per 8 esempi su 10, la stessa cosa scritta a mano dal verificatore umano ("legge un numero, calcola il doppio, stampa") su un foglio chiuso fino a quel momento.

**Passo 6. Traduzione in Python con prova.**
Comando: `node build\tools\whycode.js traduci esempi\mini-linguaggi\zeta\3.zeta --in python --test esempi\mini-linguaggi\zeta\test\3_test.py`.
Successo: `python -m py_compile` ok, test eseguiti e verdi, riga di prova in `registro\prove`.
Ripetuto per tutti e 5 gli esempi con test forniti: soglia 5 su 5 verdi, oppure 4 su 5 col quinto registrato FALLITO e motivo chiaro. Meno di 4: la milestone fallisce, si scrive il perche' e si itera (e' comunque un risultato: sappiamo dove il sistema rompe).

**Passo 7. Incastro.**
Comando: `node build\tools\whycode.js traduci esempi\mini-linguaggi\zeta\3.zeta --in python --repo esempi\repos-ospiti\serpente`.
Successo: codice Python che rispetta lo stile del repo ospite (4 spazi, snake_case, docstring in italiano semplice come nel repo), verifica di stile OK, test verdi.

**Passo 8. Frase umana scritta male, italiano.**
Comando: `node build\tools\whycode.js capisci "leggi il file input.txt, pulisi le righe vuote e scrivi il risutlato in out.txt"`.
Successo: intento estratto = leggi file, togli righe vuote, scrivi; i typo segnalati (`pulisi`, `risutlato`) e corretti senza cambiare significato; nessuna invenzione. Ripetuto su 10 frasi: almeno 8 corrette.

**Passo 9. Seconda lingua umana, scritta male.**
Stesse 10 prove in inglese con typo: `node build\tools\whycode.js capisci "read teh file and remove emty lines, writ result to out.txt"`.
Successo: almeno 8 su 10 corrette. Il report mostra che la correzione typo e' la stessa tabella per entrambe le lingue (il sistema non ha una tabella separata per lingua: la robustezza e' un meccanismo, non un elenco).

**Passo 10. REPORT finale della milestone.**
Comando: `node build\tools\whycode.js report prova-terra`.
Il report raccoglie: iterazioni di inferenza, esempi nascosti passati, traduzioni verdi, conformita' stile, frasi corrette, durate, modello usato, RAM al momento.
Successo: un file `docs\registri\PROVA-TERRA-<data>.md` con tutti i numeri. Se tutti i criteri dei passi 3-9 sono verdi: **la milestone e' passata**.

### Nota sulle eventuali sconfitte parziali

Se un passo fallisce, non si "aggiusta il criterio". Si registra FALLITO, si scrive il motivo nel report, e il lavoro successivo attacca quel punto. Un fallimento misurato vale piu' di dieci prove aggiustate.

---

## 8. Rischi globali e mitigazioni

| # | Rischio | Probabilita' | Impatto | Mitigazione | Piano B |
|---|---|---|---|---|---|
| 1 | PC corto di RAM: il modello 35B non parte o blocca tutto | Alta | Alto | F0-F1 girano senza modello; guardia RAM in verifica (SALTATO sotto 1 GB liberi) e in `setup.ps1`; per i test automatici modelli piccoli (Kev-4B, come fa system-one) | Percorso a regole pure per tutti i passi meccanici; il modello serve solo per comprensione e generazione, che restano lente ma funzionanti su modelli piccoli con GBNF |
| 2 | Modello locale debole su certi compiti (JSON sbagliato, codice che non compila) | Alta | Medio | Decodifica vincolata GBNF, prompt corti e con esempi, ciclo di riparazione guidata dagli errori (max 5 giri), doppia validazione zod | Ridurre la dimensione del compito (un intento = un pezzo piccolo); aumentare i passi deterministici e ridurre quelli generativi una variante per volta |
| 3 | Tentazione di allargare troppo presto (10 linguaggi, web UI, feature nuove) | Alta | Alto | Sezione "NON fare" per ogni fase; lista unica E:\Lavori con massimo 3 cose (regola Whyed); i criteri numerici sono il cancello | Taglio secco: si chiude la fase corrente prima di qualunque cosa nuova. Le idee nuove vanno in PIU' AVANTI, non nel codice |
| 4 | Dipendenza da internet (npm, wasm, aggiornamenti) | Media | Medio | Setup una volta e poi offline: `vendor\tree-sitter\` con i wasm nel repo, lock file, niente CDN | Se qualcosa manca al momento: si lavora con quello che c'e' (il kernel e i test non richiedono nulla), si scarica dopo |
| 5 | Errori di misura (benchmark gonfiati, confronti sporchi) | Media | Alto | Regola dura: mai ottimizzare senza numero; stesso PC, stesso interprete, mediana di 5, carico macchina annotato (motore acceso/spento); WhyObliter docet: canary e stati espliciti | Rifare la misura con script a seed fisso e a loop chiuso; se i numeri non tornano, il risultato non esiste |
| 6 | Il determinismo del collasso si rompe a un refactor | Media | Alto | Il test determinismo (100 ripetizioni) e il test replay (50 collassi) girano a ogni `npm test`, non solo in F3 | Il collasso si isola ancora di piu': input normalizzati, hash unico, niente Date.now nel percorso di scelta |
| 7 | Perdita di lavoro per sovrascritture fra agenti o tool | Media | Medio | Un solo scrittore per file (sezione 9), backup `.bak-<data>`, scritture atomiche, git locale | `git stash` o `git checkout -- .`; in ultima istanza il backup automatico di ogni file toccato fuori dalle cartelle di lavoro |

Regola generale: ogni rischio della tabella prima o poi si prova (un giorno senza 35B, una giornata con motore spento). Lo "stress test" e' previsto, non improvvisato.

---

## 9. Regime di lavoro multi-agente

Vale quando piu' agenti (o piu' sessioni) lavorano insieme su WhyCode. Obiettivo: zero pestamenti.

### 9.1 La regola dei confini

- **Un modulo per agente.** L'agente A fa `src\comprensione\`, l'agente B `src\quantico\`, e cosi' via. Non si toccano i file altrui.
- **Un solo scrittore per file.** Se un agente deve modificare un file di un altro modulo (per esempio un tipo in `condivisi`), NON lo tocca: apre una richiesta scritta in `docs\cambi\RICH-<data>-<numero>.md` (cosa serve, perche', proposta di patch). La applica il coordinatore.
- **I file di interfaccia** (`src\condivisi\tipi.ts`, `docs\FORMATI.md`, `docs\KERNEL.md`) li modifica solo il coordinatore, una modifica per volta, con `npm test` verde prima e dopo.
- **Cartelle di lavoro separate**: i test di un agente scrivono solo in `temp\<modulo>\`. Il registro vero (`registro\`) lo scrive solo il codice in esecuzione normale, non i test.

### 9.2 File di lock

Per ogni modulo che un agente prende in carico, crea:

`src\<modulo>\LAVORO-LOCK.json`

```json
{
  "agente": "A-comprensione",
  "task": "F1 inferenza grammatica",
  "inizio": "2026-10-18T09:00:00+02:00",
  "tocca": ["src/comprensione/", "tests/unit/comprensione/"],
  "stato": "in corso"
}
```

Regole del lock:

- Prima di iniziare: se esiste un lock non scaduto (piu' recente di 24 ore) con lo stesso modulo: fermarsi e chiedere al coordinatore.
- Alla fine (o all'abbandono): `"stato": "finito"` e il lock resta come traccia (non si cancella), cosi' si sa chi ha fatto cosa.
- Il coordinatore puo' forzare la chiusura di un lock scrivendo `"stato": "chiuso-dal-coordinatore"` con motivo.

### 9.3 Flusso di lavoro di un agente

1. Legge il suo modulo nella sezione 4 (API, dipendenze, primi test).
2. Crea il lock.
3. Scrive i test PRIMA (o insieme) al codice. Mai codice senza test.
4. Lancia `npm run test:unit` e poi `npm test` (su build propria).
5. Compila il rapportino in `docs\cambi\RAG-<data>-<agente>.md`: file toccati, test aggiunti, numeri, dubbi aperti.
6. Chiude il lock con stato finito.

### 9.4 Revisione

- Ogni contributo lo revisiona il coordinatore: guarda il diff, lancia `npm test` completo sul ramo unito, ricontrolla i numeri dichiarati nel rapportino (non si fidano le misure raccontate: si rieseguono).
- I moduli critici (quantico, verifica, kernel) li revisiona anche un secondo revisore umano o agente diverso dall'autore: il determinismo e la sicurezza di esecuzione non si delegano a un solo controllo.
- Un contributo con `npm test` rosso non si unisce. Mai. Si rimanda con la lista dei fallimenti.
- Le modifiche ai formati (`docs\FORMATI.md`) richiedono una modifica contestuale a tutti i test golden coinvolti, in un unico commit.

### 9.5 Git

Repo git locale in `E:\Dev\WhyCode` dalla F0. Un ramo per agente quando si lavora in parallelo: `agente/A-comprensione`. Il coordinatore unisce su `main` solo cose verdi. Commit solo quando Whyed lo chiede (regola di lavoro), ma i rami locali servono comunque a isolare e ad annullare senza perdere lavoro. Push remoti: mai, il repo e' personale, salvo decisione esplicita di Whyed.

---

## 10. Convenzioni di codice e file

### 10.1 Nomi

- File e cartelle: minuscolo, trattino, ASCII. Esempi: `inferenza-grammatica.ts`, `prova-terra.ts`, `mini-linguaggi\zeta\`. Mai spazi, mai accenti nei nomi file.
- Test: `<nomefile>.test.ts` accanto per cartella speculare in `tests\`.
- Cartelle di dati: nome al singolare se e' un contenitore logico (`kb\linguaggi\<linguaggio>\`), al plurale se e' un elenco (`collassi\`).

### 10.2 Codice

- TypeScript strict, ESM, 2 spazi, punto e virgola obbligatorio (lo stile di `wo.js` e degli altri progetti: coerente).
- **Identificatori in inglese** (`parseKernel`, `collapseId`, `variantList`). Motivo: tutti i pacchetti dell'ecosistema (tree-sitter, zod, fast-check) e le parole chiave dei linguaggi sono in inglese; mescolare le lingue negli identificatori crea bug di traduzione mentale. Le stringhe di interfaccia utente, i messaggi di errore e i commenti sono in **italiano semplice**.
- **Commenti in italiano semplice, pochi e utili.** Un commento spiega un perche' (una decisione, una trappola), non un cosa che si legge dal codice. Esempio di commento giusto: `// la grammatica con thinking manda il modello in loop: sempre enable_thinking false qui`. Esempio di commento sbagliato: `// incrementa i`.
- **Niente emoji nei file**, mai, in nessun tipo di file (codice, test, docs, report, JSON).
- **Niente trattini lunghi** nei documenti e nei report: due punti o parentesi.
- Funzioni piccole, una responsabilita' per funzione. Niente classi dove basta una funzione pura. Il core (kernel, quantico) deve restare senza stato globale: gli stati vivono nei file, letti e scritti in modo esplicito.
- Errori: sempre `ErroreWhyCode` con codice e rimediabile si/no. Mai `throw new Error("...")` nudo fuori dai test.

### 10.3 Dati

- JSON: chiavi in italiano semplice per schede, registro e formati che Whyed legge (`"nome"`, `"aggiornata"`, `"motivo"`). Codice e API interne: campi in inglese. La regola: **se lo legge Whyed e' italiano, se lo legge il computer e' inglese**.
- JSONL: una riga per evento, mai riscrittura, campi obbligatori minimi: `id`, `ora` (ISO 8601), `tipo`. Ogni tipo aggiunge i suoi campi.
- Date: sempre ISO 8601 con timezone locale (`2026-10-17T09:30:00+02:00`). Mai date ambigue `17/10/26`.
- Numeri: i tempi in millisecondi interi, le memorie in KB interi. Mai millisecondi con virgola nei registri (conflitti di locale Windows).

### 10.4 Git e commit (quando Whyed lo chiederà)

Formato: `tipo(ambito): descrizione breve in italiano`. Tipi ammessi: `feat`, `fix`, `test`, `doc`, `strumenti` (tool), `pulizia`. Esempi:

```
feat(quantico): collasso deterministico con registro
fix(comprensione): typo con accenti non corretti
test(kernel): roundtrip su 20 file
```

Un commit = una cosa. Mai commit con `npm test` rosso, mai commit di dati generati (`build\`, `temp\`, `log\`).

### 10.5 `.gitignore` minimo

```
build/
temp/
log/
node_modules/
*.bak-*
```

`vendor\` e `registro\` e `kb\` si versionano: sono il valore del progetto.

---

## 11. Definition of done

### 11.1 Di una fase

Una fase e' finita quando TUTTE queste cose sono vere:

1. Tutti i deliverable della fase esistono e sono elencati nel report di fase.
2. Tutti i criteri numerici della fase sono verdi, con i numeri scritti nel report (numeri reali, non "circa").
3. `npm test` completo verde, e i test nuovi della fase coprono i casi elencati nella sezione di fase.
4. `npm run golden:verifica` verde.
5. Il REPORT di fase e' salvato in `docs\registri\<FASE>-<data>.md`.
6. Ogni cosa e' annullabile: git ha il commit o lo stato precedente e' recuperabile.
7. La sezione 12 (cose aperte) e' aggiornata: se la fase ha chiuso una decisione, la spunta; se ne ha aperte di nuove, le scrive.

### 11.2 Del progetto intero

Il progetto (versione 1) e' "fatto" quando:

1. La prima prova a terra (sezione 7) passa al 100%, con report archiviato.
2. Tutte le fasi F0-F5 soddisfano la definizione di fase.
3. Un linguaggio nuovo (mai visto, descritto solo da esempi) studiato dopo la F5 richiede meno token e meno iterazioni del primo studio della stessa famiglia, e il numero sta nel report (l'effetto "ogni volta piu' resistente" e' dimostrato).
4. Le 3 lingue umane rumorose (italiano, inglese, e una terza scelta poi) sono capite al 90% sulle frasi di prova.
5. Whyed puo' lanciare `npm test` e `node build\tools\whycode.js report stato` e vedere da solo, in due minuti, che tutto e' verde e che la KB e' cresciuta.

---

## 12. Cosa resta aperto, e in che ordine si decide

Ordine di decisione (ognuna ha una fase in cui SI DEVE decidere, non "prima o poi"):

| # | Cosa | Si decide in | Chi decide | Come |
|---|---|---|---|---|
| 1 | Sintassi esatta del kernel (la bozza sta in appendice B) | F0, primo giorno | Whyed approva, agente propone | si scrive `docs\SPEC-01-KERNEL.md`, 10 esempi, e si prova il parser. Se la sintassi non regge i 40 casi di test si cambia subito, in F0 costa poco |
| 2 | Le 15 etichette UAST esatte | F0 fine, prima di F1 | agente propone lista, Whyed guarda | elenco in `docs\FORMATI.md`, ognuna con definizione in una riga e 2 esempi |
| 3 | Formato esatto del Modello di Comprensione | F0 | agente | schema zod + 3 esempi reali (Python, JavaScript, L1) |
| 4 | Terza lingua umana del test rumoroso | F1 inizio | Whyed | proposta: spagnolo (parole comuni con italiano e inglese, utile per misurare se il meccanismo e' generale); alternativa: tedesco (piu' difficile, prova piu' dura) |
| 5 | Quali 10 task di benchmark in F5 | F5 inizio | Whyed | lista in E:\Lavori, 3 alla volta |
| 6 | Passaggio a SQLite per il registro | quando scatta la soglia 20.000 righe o 2 secondi | agente propone con numeri, Whyed approva | misura prima, decisione dopo |
| 7 | Passaggio da WASM a binding nativo tree-sitter | se e quando il parsing diventa collo di bottiglia misurato | agente propone con numeri | stesso metodo |
| 8 | Prima coppia di F4 (Python+JavaScript o Python+C) | F4 inizio | Whyed | proposta: Python+JavaScript (piu' facile da testare senza toolchain C) |
| 9 | Modello maestro frontier opzionale | mai obbligatorio, si valuta dopo la milestone | Whyed | solo se la milestone mostra un buco che il locale non copre |

Regola per le cose aperte: nessuna cosa aperta blocca il lavoro della fase corrente. Ognuna ha "si decide in": fino a quel momento non si discute, si fa quello che dice questo documento.

---

## Appendice A. Formati concreti (bozze da approvare in F0)

### A.1 Scheda linguaggio, `kb\linguaggi\python\scheda.json`

```json
{
  "nome": "python",
  "versione_studiata": "3.13",
  "famiglia": "serpenti",
  "grammatica": { "tipo": "tree-sitter", "pacchetto": "tree-sitter-python", "wasm": "vendor/tree-sitter/tree-sitter-python.wasm" },
  "uast_version": 1,
  "idiomi": ["list comprehension", "with per le risorse", "f-string"],
  "trappole": ["indentazione significativa", "mutabilita' dei default", "late binding delle closure"],
  "stile_default": { "indent": 4, "nomi": "snake_case", "virgolette": "doppie" },
  "benchmark": [],
  "confidenza": 0.6,
  "stato": "in-prova",
  "studiata_il": "2026-10-20",
  "aggiornata": "2026-10-20",
  "note": "studiata da zero in F1"
}
```

### A.2 Riga di registro collasso, `registro\collassi\collassi.jsonl`

```json
{"id":"CL-20261017-0001","ora":"2026-10-17T15:04:05+02:00","tipo":"collasso","intento_hash":"sha256:ab12...","lingua_uscita":"python","vincoli":{"stile":"serpente","test":"forniti"},"varianti":["V1","V2","V3"],"scelta":"V2","motivo":"V1 fallisce 1 test; V3 stile non conforme; V2 corretta e conforme","versione_regole":"0.1.0","esito_verifica":"ok","durata_ms":4213}
```

### A.3 Modello di Comprensione (estratto)

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

### A.4 Riga di registro prove, `registro\prove\prove.jsonl`

```json
{"id":"PR-20261017-0003","ora":"2026-10-17T15:06:10+02:00","tipo":"prova","cosa":"traduci zeta/3.zeta in python","comando":"python -m py_compile 3.py","esito":"ok","durata_ms":812}
```

## Appendice B. Bozza della grammatica kernel (si approva in F0)

Forma a blocchi, righe corte, italiana. Tutto minuscolo. `#` commento fino a fine riga.

```
# esempio.why
intento leggiEscrivi {
  dato percorso: testo
  effetto leggi(percorso) -> testo
  funzione pulisci(testo) -> testo
  effetto scrivi(risultato: testo)
}

vincoli {
  uscita: automatico
  test: forniti
  stile: repo-ospite
}

uscita {
  codice
  test-verdi
  benchmark
}
```

Regole minime del kernel:

1. Un file e' una sequenza di blocchi. Blocchi iniziali ammessi: `intento`, `vincoli`, `uscita`.
2. Dentro `intento`: `dato`, `funzione`, `effetto`, `vincolo`, `test`. Le frecce `->` dichiarano ingressi e uscita.
3. Dentro `vincoli` e `uscita`: coppie `chiave: valore`, un per riga.
4. Nei nomi: lettere, numeri, trattino basso. Niente spazi.
5. Mai nomi di linguaggi reali nel kernel. Se un concetto appartiene a un linguaggio e non a tutti, va nei dialetti (livello 1), non qui.
6. Errori di sintassi: riportare riga, colonna, cosa manca. Il parser non tira mai eccezioni crude.

Irrobustimenti decisi in F0 (da provare nei 40 casi di test): blocchi annidati dentro `funzione`, piu' file che si importano tra loro, un blocco `test` che dichiara casi attesi.

## Appendice C. Comandi rapidi (foglio da attaccare al muro)

```powershell
# preparazione, una volta
cd E:\Dev\WhyCode
npm ci
powershell -File scripts\setup.ps1

# ciclo normale di lavoro
npm test                        # build + tutti i test
npm run test:unit               # solo unit
npm run golden:verifica         # i file attesi sono ancora giusti
powershell -File scripts\stato.ps1   # stato sintetico: test, registro, disco

# studiare un linguaggio
node build\tools\whycode.js studia esempi\mini-linguaggi\zeta
node build\tools\whycode.js capisci esempi\mini-linguaggi\zeta\3.zeta

# tradurre con prova
node build\tools\whycode.js traduci esempi\mini-linguaggi\zeta\3.zeta --in python --test esempi\mini-linguaggi\zeta\test\3_test.py

# quantico
node build\tools\whycode.js collassa esempi\intenti\pulisci-righe.why
node build\tools\whycode.js replay CL-20261017-0001

# milestone
node build\tools\whycode.js report prova-terra
```

Fine del documento.
