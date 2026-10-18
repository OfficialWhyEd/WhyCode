# WhyCode: Progetto

Progettazione avviata il 17/10/2026.
Le parole di Whyed sono la fonte. Lo stato dell'arte e' la base da cui partire.

---

## 1. Cos'e' WhyCode

Parole di Whyed, 14/10/2026:

> "un linguaggio di codice come gli altri con la particolarita' incredibilmente intelligente e assurda che puo' essere ogni linguaggio esistente e legarsi con ogni linguaggio o meno, una specie di codice quantico che lavora in reverse engineering al momento per trovare sempre la composizione giusta e continua di qualsiasi codice in maniera deterministica ma appunto quantistica, per renderlo estremamente flessibile che abbia il risultato di qualunque codice che esistera' e che gia' esiste con un sistema di comprensione momentanea ed adattamento che ogni volta e' sempre piu' resistente conoscendo ed adattando tutti i linguaggi (test possono essere ad esempio far comprendere ogni parola ogni frase leggibile male da ogni lingua ma comprensibile), questa e' la stessa filosofia di whycremisi che non serve che conosca tutti i plugin appena li vede e' cosi' intelligente da studiarlo al momento ed adattarsi"

Parole di Whyed, 17/10/2026:

> "una lingua che parla tutte le lingue esistenti e quelle che esisteranno, ha una knowledge base di base AI che lavora in modo tale da sostanzialmente non sapere ogni singolo linguaggio di programmazione esistente, gli basta studiare al momento il linguaggio e il modello e' cosi' intelligente e il codice di whycode e' cosi' sviluppato da studiarlo al momento e inventarne uno che si incastri... la risposta ha un'ottimizzazione di codice notevole"

In una riga:

**WhyCode non impara i linguaggi. Li studia al momento. Poi genera il codice giusto, che si incastra, verificato e ottimizzato.**

Filosofia madre (da WhyCremisi): non serve conoscere tutti i plugin in anticipo. Appena li vedi, li studi e ti adatti.

---

## 2. I sei principi

Dalle sue parole, senza aggiungere e senza togliere.

1. **E' un linguaggio vero.** Si scrive, si legge, ha una grammatica. ("un linguaggio di codice come gli altri")
2. **Non sapere: saper studiare.** Nessun linguaggio e' precaricato dentro. Al momento si studia. ("gli basta studiare al momento il linguaggio")
3. **Puo' essere ogni linguaggio.** Quelli che esistono e quelli che esisteranno. Il codice entra e viene capito. L'intento esce nella lingua scelta. ("puo' essere ogni linguaggio esistente e legarsi con ogni linguaggio")
4. **Si lega, non solo traduce.** Interoperabilita' vera col codice che resta dov'e'. ("legarsi con ogni linguaggio")
5. **Inventa la forma che si incastra.** Non traduce riga per riga: compone la versione giusta per quel contesto. ("studiarlo al momento e inventarne uno che si incastri")
6. **Deterministico ma "quantistico".** Tutte le possibilita' in superposizione, poi un collasso deciso, registrato e riproducibile. Ogni giro e' piu' resistente. ("in maniera deterministica ma appunto quantistica", "ogni volta e' sempre piu' resistente")

Test di accettazione delle lingue umane (suo):
> "far comprendere ogni parola ogni frase leggibile male da ogni lingua ma comprensibile"

Test di accettazione del codice:
> "la risposta ha un'ottimizzazione di codice notevole"

---

## 3. Cosa esiste nel mondo (ricerca 17/10/2026)

Prima regola di lavoro: si parte dal meglio che esiste. Ecco il meglio, verificato.

| Pezzo dell'idea | Cosa esiste oggi | Verdetto |
|---|---|---|
| Studiare un linguaggio al momento | **Kajal** (2024): un LLM estrae la grammatica BNF da esempi, con ciclo di correzione dagli errori del parser. **Grammar prompting** (NeurIPS 2023). **HyGenar** (2025): grammatica da esempi positivi e negativi. | Dimostrato. Si prende. |
| Capire qualsiasi sintassi | **Tree-sitter**: parser incrementale con grammatiche per centinaia di linguaggi. Tollerante agli errori. | Base pronta. |
| Rappresentazione universale | **UAST**: Babelfish (source{d}), YASA-UAST (Ant Group, 2026), EASE 2026 (spazio semantico condiviso tra linguaggi con graph matching). | Parziale e attivo. Si spinge avanti. |
| Tradurre fedelmente | Pipeline algorithm-based con specifica intermedia (ICPC 2026): accuratezza da 67,7% a 78,5%. **InterTrans** (ICLR 2025): 87,3%-95,4% con traduzioni intermedie. **TransAgent**: allineamento + riparazione multi-agente. | Buono ma non risolto. Da battere. |
| Efficienza del codice tradotto | **SwiftTrans** (ICML 2026): i programmi tradotti dagli LLM sono lenti, e con la sola scrittura del prompt non si risolve. Selezione guidata tra candidati diversi. | Il problema e' aperto. Qui attacchiamo. |
| Legarsi con ogni linguaggio | **GraalVM/Truffle**: protocollo standard di interoperabilita' (n meccanismi per n linguaggi, non n al quadrato). **MetaFFI** (2024). **polyglot-ffi**: binding FFI generati in automatico. **CrossPL** (2025): benchmark di codice interoperabile tra linguaggi. | Modello pronto. Si adotta la stessa logica. |
| Linguaggi nuovi come librerie | **Racket / Rhombus** (v1.1, 2026): il linguaggio e' una libreria, si estende senza toccare il nucleo. | Ispirazione per il kernel. |
| Generare codice che compila al primo colpo | **Decodifica vincolata dalla grammatica** (NeurIPS 2026, su MLIR): un modello piccolo (1,7B) con vincoli di schema batte modelli 34B e genera codice valido per dialetti mai visti, senza riaddestramento. | La prova che "studiare al momento" funziona. |
| Ottimizzazione con l'AI | **MLGO** (LLVM): inlining e register allocation guidati da modelli ML, fino a -7% dimensione. **IR2Vec**: embeddings del codice. **SuperCoder** (COLM 2026): l'LLM come super-ottimizzatore. Conclusione: l'LLM puo' superare il compilatore, ma non sostituirlo. | Componente del progetto. Superoptimizer + misura. |
| Capire testi scritti male | **MulTypo** (ACL 2026), **WikiTypo** (2025): i typo fanno perdere 2,3-4,3 punti ai modelli. Serve addestramento a prova di rumore. | Il suo test e' la direzione giusta. |
| Sintesi da esempi | **PBE con LLM** (Cornell 2024), execution-guided synthesis (ICLR 2025), FlashFill. | Tecniche disponibili. |

**Il pezzo veramente nuovo di WhyCode** (non esiste insieme, in nessun progetto trovato):
il livello di superposizione con collasso deterministico e registrato, piu' l'apprendimento cumulativo collegato, piu' la robustezza alle lingue umane scritte male. Ogni pezzo singolo ha uno stato dell'arte. L'insieme no.

---

## 4. Architettura: sei livelli

### Livello 0: Kernel (la knowledge base di base)

Il suo "knowledge base di base AI": un nucleo piccolo, stabile, che non cambia mai.
Contiene solo concetti universali, validi per qualsiasi linguaggio, presente o futuro:

- valore, tipo, funzione, flusso, effetto (I/O, stato, errore), dato, vincolo, intenzione, test.

Regole del kernel:
- Grammatica minima e leggibile (forma a blocchi, stile leggero).
- Nel kernel non compare MAI il nome di un linguaggio specifico. Niente "Python", niente "Java". Se un concetto appartiene a un linguaggio e non a tutti, vive nei dialetti (livello 1), non nel kernel.
- Tutto il resto di WhyCode e' un'estensione sopra il kernel. Come Racket: linguaggi come librerie.

### Livello 1: Comprensione (studiare al momento)

Input: qualsiasi cosa. Sorgente di un linguaggio noto, sorgente di un DSL mai visto, solo esempi, documentazione, o frasi umane scritte male.

Passi:
1. **Parser reale se esiste.** Tree-sitter ha la grammatica: si usa subito.
2. **Grammatica inferita se non esiste.** Da esempi positivi e negativi il modello propone una BNF, un parser la prova, gli errori tornano al modello, si corregge. (Metodo Kajal.)
3. **Normalizzazione UAST.** Etichette semantiche universali (funzione, ciclo, chiamata, assegnazione, import) piu' attributi specifici del linguaggio, conservati.
4. **Semantica.** Il modello estrae: cosa fa il codice, contratti, invarianti, casi di bordo, tipi, errori, intenzioni.
5. **Tolleranza al rumore.** Input con typo o scritto male: la comprensione non si rompe. (Direzione MulTypo, noise-aware.)

Output: **Modello di Comprensione**. Una rappresentazione che dice cosa fa quel codice, in modo indipendente dal linguaggio.

### Livello 2: Spazio quantico (il cuore originale)

Qui vive la parte sua, quella "quantistica".

- Un programma WhyCode non e' una cosa sola: e' uno **spazio di realizzazioni possibili**.
- Per ogni intento esistono N modi di realizzarlo in ogni linguaggio target: idiomi, librerie, prestazioni, stile.
- I **vincoli** (tipo, memoria, piattaforma, stile del repo ospite, standard) restringono lo spazio.
- **Superposizione**: tutte le varianti compatibili coesistono, come stati possibili. Nulla e' deciso finche' non serve.
- **Collasso**: quando serve il codice finale, si sceglie. La scelta e' una **funzione deterministica** di (intento, vincoli, contesto, versione delle regole). Stesso input, stessa scelta. Sempre.
- **Registro del collasso**: ogni scelta e' scritta in un registro. Si puo' riprodurre, confrontare, annullare. (Stessa disciplina di WhyObliter: registro e REPORT.)

Il "quanto" e' lo spazio delle possibilita'. Il "deterministico" e' il collasso registrato. Le due parole sue stanno insieme esattamente cosi'.

Ordine dei criteri di scelta: correttezza, poi incastro, poi prestazioni, poi stile. La correttezza non si negozia.

### Livello 3: Sintesi e incastro (il compositore)

- Compone codice nel linguaggio target: non parola per parola, ma **realizzazione dell'intento** nel modo giusto.
- **Incastro**: studia il codice ospite (convenzioni di nomi, pattern, librerie gia' presenti, stile) e produce codice che sembra scritto li' dentro.
- **Legame (interop)**: quando il codice deve convivere con un altro linguaggio senza riscrittura, genera binding o comunicazione (logica MetaFFI/FFI: 2n meccanismi per n linguaggi, non n al quadrato).
- **Verifica prima di consegnare**: compila, esegue, passa i test. Ogni pezzo e' provato prima di dirsi fatto.

### Livello 4: Ottimizzazione (il "notevole")

- Il risultato non e' solo corretto: e' ottimizzato. E' una promessa misurabile.
- Tre meccanismi: varianti multiple (SwiftTrans), super-ottimizzazione guidata dal modello (SuperCoder), regole di ristrutturazione con misura (ispirazione MLGO ma a livello sorgente).
- Regola dura: **si ottimizza solo con misura**. Benchmark prima/dopo. Il numero e' la prova. Mai "sembra piu' veloce".

### Livello 5: Memoria e resistenza (il diventare piu' forti)

- Ogni linguaggio studiato diventa una **scheda permanente**: grammatica inferita, idiomi, trappole, esempi, benchmark.
- La knowledge base cresce in locale, dentro il progetto.
- "Ogni volta piu' resistente": il prossimo linguaggio simile e' piu' veloce. Il prossimo typo non fa danno. La conoscenza si accumula.

### Motore AI

- Motore di default: **WhyLocalLM** (il modello locale di Whyed). Quando serve piu' potenza: un modello frontier, come maestro.
- Coerente con l'ecosistema:
  - **WhyLocalLM** esegue.
  - **WhyObliter** registra e misura (il suo registro e' il modello per il registro dei collassi).
  - **WhyCode** e' il linguaggio universale che li collega.
- Il "codice nel codice" (comunicazione in codice di WhyLocalLM) e' un concetto vicino: WhyCode puo' diventare la lingua madre di quel sistema.

### I due nomi dell'approccio: WhyStocastic e WhyQuantum

Deciso da Whyed il 17/10/2026. L'approccio di WhyCode ha due nomi, e sono due parti che vanno a braccetto:

- **WhyStocastic**: la parte stocastica. La generazione delle varianti (livello 2), il campionamento, il rumore, la statistica, la misura. E' il respiro: tante possibilita' vere, mai una sola imposta.
- **WhyQuantum**: la parte quantistica. La superposizione delle varianti e il collasso deterministico registrato (livello 2). E' la decisione: una sola scelta, riproducibile e verificabile.

Insieme formano il cuore: WhyStocastic apre lo spazio, WhyQuantum lo chiude con una scelta che si puo' rifare. Senza il primo non c'e' varieta', senza il secondo non c'e' fiducia.

E l'insieme si sposa con **WhyConsciousness**: la memoria che cresce (livello 5) e' la stessa direzione della sua ricerca su coscienza e AI. Le tracce cognitive (in MATERIALE di WhyConsciousness, WhyDistil) sono gia' dichiarate come supplemento di ricerca per WhyCode. La conoscenza accumulata e' la parte "cosciente" di WhyCode: studia, ricorda, diventa piu' resistente.

---

## 5. Come si scrive WhyCode

- **Entra da ogni lingua**: il codice esistente (o esempi, o grammatica, o testo umano) viene compreso e diventa modello WhyCode.
- **Esce nella lingua giusta**: l'intento viene realizzato nel linguaggio di destinazione, incastrato e ottimizzato.
- **Si scrive una volta**: WhyCode e' il punto centrale. Non si riscrive per ogni linguaggio. Si dichiara l'intento, i vincoli, e si lascia decidere il collasso.

Esempio di flusso (forma illustrativa, da raffinare):

    INTENTO  leggi il file, pulisci le righe vuote, scrivi il risultato
    VINCOLI  linguaggio di uscita: quello del repo; stile: quello del repo; test: fornisci tu
    USCITA   codice che compila, test che passano, benchmark registrato

(La sintassi esatta e' in `docs\SPEC-01-KERNEL.md`, da approvare in Fase 0.)

---

## 6. Cosa e' difficile (onesta')

1. **La fedelta' al 100% non e' garantita da nessuno oggi.** La ricerca arriva all'87-95% sui casi favorevoli e molto meno su quelli difficili. La verifica con esecuzione e test e' l'unica rete di sicurezza vera. Il sistema non dice mai "fatto" senza prova.
2. **Inferire la grammatica di un linguaggio enorme** e' piu' difficile che per un DSL. Mitigazione: partire da testi reali, ciclo di correzione, e grammatiche esistenti quando ci sono.
3. **L'ottimizzazione notevole richiede misura.** Senza benchmark, "notevole" e' una parola vuota. Servono numeri.
4. **Il determinismo del collasso va progettato con cura.** Stesso input deve dare stessa scelta. Questo si controlla e si testa dal primo giorno.
5. **Il PC e' corto di RAM** (il 35B non parte senza riavvio). La Fase 0 si progetta per girare anche con modelli piccoli e senza modello (regole pure), cosi' non si blocca mai.

---

## 7. Roadmap

### Fase 0: Fondamenta (immediata, leggera, nessun modello richiesto)
- Grammatica del kernel: fatta (`docs\SPEC-01-KERNEL.md`, da approvare).
- Costruire lo scheletro: cartelle, formato delle schede di memoria, registro dei collassi.
- Definire il formato del Modello di Comprensione e del registro.
- Ogni pezzo con test automatici.

### Fase 1: Comprensione
- Integrare tree-sitter (grammatiche gia' esistenti).
- Grammatica inferita da esempi (metodo Kajal) per linguaggi senza grammatica.
- UAST minimo (10-15 etichette universali).
- Prova multi-lingua umana: frasi scritte male, piu' lingue, comprensione corretta.

### Fase 2: Sintesi e incastro
- Da WhyCode a Python, JavaScript, C (i tre bersagli di partenza).
- Lettura dello stile del repo ospite.
- Verifica: compilazione, esecuzione, test.

### Fase 3: Spazio quantico
- Varianti multiple per intento.
- Collasso deterministico registrato, con replay verificabile.

### Fase 4: Interop
- Binding automatici tra linguaggi (logica 2n).

### Fase 5: Ottimizzazione e memoria cumulativa
- Benchmark before/after.
- Schede di memoria per ogni linguaggio studiato.
- La KB che cresce da sola a ogni uso.

### Prima prova a terra (la milestone che dimostra l'idea)

> **Un mini linguaggio inventato al momento, mai visto prima, descritto solo da esempi, viene capito e riscritto in Python che passa i test. Poi una frase scritta male in due lingue umane viene capita lo stesso.**

Se questa prova passa, l'idea e' vera. Tutto il resto e' scala.

---

## 8. Ruolo nell'ecosistema Why

- **WhyLocalLM** e' il motore che esegue WhyCode in locale.
- **WhyObliter** e' il laboratorio di misura; il registro dei collassi di WhyCode segue lo stesso rigore.
- **WhyCremisi** ha dato la filosofia: studiare al momento e adattarsi.
- **WhyCode** e' il pezzo che parla tutte le lingue: il collante universale dell'ecosistema.
- **WhyConsciousness** da' la direzione profonda: coscienza, memoria e tracce cognitive. Le sue tracce (WhyDistil) sono gia' dichiarate come supplemento di ricerca per WhyCode. Il livello 5 (memoria) e' la sua parte viva.

---

## 9. Documenti di progettazione (17/10/2026)

La progettazione completa sta in `docs\`. Indice e stato in `README.md`.

| Documento | Cosa contiene | Righe |
|---|---|---|
| `docs\SPEC-01-KERNEL.md` | Kernel: grammatica EBNF, 9 concetti, tipi, errori K, dialetti, test | 686 |
| `docs\SPEC-02-COMPRENSIONE.md` | Comprensione al momento: tree-sitter, inferenza, UAST, rumore | 1176 |
| `docs\SPEC-03-QUANTICO.md` | Spazio quantico: collasso deterministico, registro, replay | 1132 |
| `docs\SPEC-04-SINTESI-INCROSTO.md` | Sintesi, incastro nel repo ospite, interop, verifica | 1701 |
| `docs\SPEC-05-OTTIMIZZAZIONE.md` | Ottimizzazione con misura: protocollo, regole, report | 1243 |
| `docs\SPEC-06-MEMORIA.md` | Memoria: schede linguaggio, KB che cresce | 1167 |
| `docs\SPEC-07-MOTORE-WHYLOCALLM.md` | Motore: ruoli del modello, prompt, fallback | 989 |
| `docs\SPEC-08-FONDAZIONI-FORMALI.md` | Fondazioni: teoremi, invarianti, statistica di "notevole" | 475 |
| `docs\SPEC-09-ALGORITMI-CRITICI.md` | Algoritmi in pseudocodice, test obbligatori, complessita' | 559 |
| `docs\PIANO-IMPLEMENTAZIONE.md` | Piano: stack Node+TS, moduli, fasi, rischi, comandi | 855 |

---

## Fonti della ricerca (17/10/2026)

- MLIR: mlir.llvm.org, Rationale, Transform Dialect (arXiv 2409.03864). Decodifica vincolata su MLIR (NeurIPS 2026).
- Tree-sitter: tree-sitter.github.io (grammatiche per qualsiasi linguaggio, incrementale, tollerante agli errori).
- Kajal (arXiv 2412.08842). Grammar prompting (NeurIPS 2023). HyGenar (arXiv 2505.16978). PBE con LLM (Cornell 2024). Execution-guided synthesis (ICLR 2025).
- Code translation: ICPC 2026 (arXiv 2602.16106). InterTrans (ICLR 2025). TransAgent (arXiv 2409.19894v5). SwiftTrans (ICML 2026, arXiv 2606.17683). CodeTransOcean (EMNLP 2023). CodeTransBenchmark (arXiv 2609.20257). CrossPL (arXiv 2507.19904). Survey multilingual code (arXiv 2604.25960).
- UAST: Babelfish source{d}, YASA-UAST (arXiv 2601.17390), EASE 2026 (arXiv 2605.07788).
- Interop: GraalVM Truffle (graalvm.org), MetaFFI (arXiv 2408.14175), polyglot-ffi.
- Ottimizzazione: MLGO (arXiv 2101.04808, LLVM 22 docs), IR2Vec/MIR2Vec (LLVM), SuperCoder (COLM 2026, arXiv 2505.11480).
- Racket/Rhombus: racket-lang.org, "Languages as Libraries" (PLDI 2011), Rhombus v1.1 (2026).
- Rumore: WikiTypo (arXiv 2501.08322), MulTypo (ACL 2026, arXiv 2510.09536).
