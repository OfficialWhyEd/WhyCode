# SPEC-08: Fondazioni formali di WhyCode

Stato: prima stesura completa, 17/10/2026. Da approvare in Fase 0.
Fonti: PROGETTO.md, SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07, PIANO-IMPLEMENTAZIONE.md.
Scopo: dare a WhyCode le fondamenta matematiche. Definizioni, invarianti, teoremi con prova, limiti dichiarati.
Regola di lettura: questo documento non sostituisce le specifiche. Le rende dimostrabili.

Perche' esiste questo documento:
1. Il collasso deterministico e' il cuore originale di WhyCode. Un cuore si dimostra, non si spera.
2. La parola "notevole" (sua) da sola e' vuota. Qui diventa una definizione statistica con numeri.
3. "Stocastico nella generazione, deterministico nella decisione": qui le due parole hanno una forma esatta.
4. Ogni promessa fatta a Whyed deve avere un limite dichiarato. I limiti stanno qui, nero su bianco.

I due nomi dell'approccio (decisi da Whyed il 17/10/2026):
- Le sezioni 3 e 4 (generazione stocastica, campionamento, superposizione) descrivono **WhyStocastic**.
- Le sezioni 5, 6 e 7 (collasso, registro, replay) descrivono **WhyQuantum**.
- Le sezioni 8, 9 e 10 (apprendimento, rumore, statistica) sono il ponte con **WhyConsciousness**:
  la memoria che cresce e capisce. I due vanno a braccetto e la memoria li tiene insieme.

---

## 1. Notazione e definizioni di base

| Simbolo | Significato |
|---|---|
| `i` | intento (blocco `intento` del kernel, SPEC-01) |
| `c` | insieme dei vincoli (blocco `vincoli` piu' righe `vincolo`) |
| `k` | contesto: repo ospite, linguaggio target, piattaforma, versione delle regole |
| `L` | linguaggio target (studiato al momento, mai precaricato) |
| `KB` | knowledge base: schede linguaggio, idiomario, indice (SPEC-06) |
| `R` | registro dei collassi: sequenza append-only di record firmati con catena di hash (SPEC-03) |
| `V(i, L, c)` | spazio delle varianti: l'insieme dei candidati realizzabili per (i, L, c) |
| `v` | una variante: programma candidato in forma WhyCode piu' forma concreta per L |
| `M` | il modello locale (WhyLocalLM) o un maestro, usato come generatore |
| `H(x)` | SHA-256 di x |
| `canon(x)` | serializzazione canonica di x (JSON con chiavi ordinate, numeri normalizzati, NFC, LF) |
| `P(v \| i, L, c, KB)` | distribuzione di generazione delle varianti (stocastica) |
| `f_col` | funzione di collasso (sezione 5) |

Definizione 1.1 (esecuzione WhyCode). Una esecuzione e' la tupla
`E = (i, c, k, L, V, v*, R')` dove `v*` e' la variante collassata e `R'` e' il registro dopo.
Ogni esecuzione produce anche un esito di verifica `esito = (L1, L2, L3, L4, L5)` (sezione 11).

Definizione 1.2 (consegna). Una consegna e' un'esecuzione con `esito` tutto verde e con
allegati: codice, test, benchmark, record di registro. Senza questi allegati non e' una consegna.

Definizione 1.3 (sessione). Una sessione e' una sequenza di esecuzioni che condividono la stessa KB
e lo stesso registro. La KB evolve fra una esecuzione e la successiva (sezione 8).

---

## 2. Il modello formale completo (macchina a stati)

WhyCode e' una macchina a stati con memoria persistente su disco.

```
Stato = (KB, R, coda)
- KB    : knowledge base versionata (ogni voce ha provenienza e data)
- R     : registro append-only (catena di hash)
- coda  : lavori in attesa (comprensioni, sintesi, misure)

Transizioni principali:
STUDIA (L, esempi)      -> aggiorna KB con una scheda linguaggio (con gate, sezione 8)
CAPISCI (sorgente)      -> produce Modello di Comprensione (SPEC-02)
GENERA  (i, c, k, L)    -> produce V(i, L, c) campionato da P (stocastico)
FILTRA  (V, c)          -> produce V' (sottoinsieme compatibile con i vincoli)
COLLASSA(V', i, c, k)   -> produce v* e un record nel registro (deterministico)
SINTETIZZA(v*, k)       -> produce codice concreto per L, incastrato nel repo ospite
VERIFICA(codice)        -> produce esito a 5 livelli
MISURA  (codice, suite) -> produce numeri con intervalli di confidenza
CONSEGNA(v*, esito)     -> solo se tutto verde (Definizione 1.2)
ANNULLA (record)        -> ripristino allo stato precedente al record (reversibilita')
```

Proprieta' strutturali della macchina:
- P1. Solo COLLASSA scrive nel registro R. Le altre transizioni scrivono nella KB solo tramite gate.
- P2. CONSEGNA non puo' avvenire da uno stato con esito non verde. E' una guardia, non una raccomandazione.
- P3. ANNULLA e' sempre possibile per l'ultima consegna: il record contiene tutto cio' che serve.
- P4. Nessuna transizione usa la rete senza consenso esplicito (invariante I10).

---

## 3. Generazione stocastica delle varianti

La generazione e' l'unico punto stocastico di WhyCode. Tutto il resto e' deterministico o misurato.

Definizione 3.1 (generazione). `GENERA(i, c, k, L, KB) -> V` campiona `n` candidati da
`P(v | i, L, c, KB)`, la distribuzione del modello M con i parametri di campionamento decisi
(temperatura, top-p, n). n dipende dal budget (sezione 12), non dal caso.

Perche' stocastico e' giusto qui:
1. Intenti complessi hanno tante realizzazioni buone. Un solo campione le nasconde.
2. Varianti diverse permettono il confronto misurato (SPEC-05): differenza di qualita', non solo parola del modello.
3. Il collasso deterministico (sezione 5) rende la scelta finale riproducibile comunque.

Regole di igiene della stocasticita':
- S1. Ogni variante porta con se': parametri di campionamento, versione del modello, versione delle regole.
- S2. Il campione va filtrato prima del collasso: vincoli violati fuori (sezione 4).
- S3. Due modalita' di entropia:
  - Modalita' registrata (default): entropia reale, ma ogni risultato va nel registro. Replay fedele.
  - Modalita' stretta: seme derivato da `H(canon({i, c, k, versioneRegole}))`. Riproducibile end-to-end senza registro.
- S4. Il numero di varianti mai oltre il budget dichiarato. Se il budget finisce, si collassa su quello che c'e' e lo si dichiara.

---

## 4. Superposizione e vincoli (algebra dei vincoli)

Definizione 4.1 (superposizione). Lo stato di superposizione di un'esecuzione e' la coppia
`(V, punteggi)` : tutte le varianti compatibili coesistono con il loro punteggio di qualita'.
Nulla e' deciso finche' COLLASSA non viene chiamata. La superposizione non e' fisica: e' un insieme
di candidati con punteggi. Il nome "quantistico" (suo) descrive bene il comportamento, non serve altra fisica.

Definizione 4.2 (vincolo). Un vincolo e' una funzione decidibile `c_j : Variante -> {vero, falso}`
(o `{vero, falso, ignoto}` se il vincolo richiede informazione non disponibile).
I vincoli puri del kernel (SPEC-01, K-110) restano decidibili sui dati della variante.

Regola di filtro:
```
FILTRA(V, c):
  V' = { v in V : per ogni c_j in c, c_j(v) != falso }
  se V' vuoto -> esito NESSUN_CANDIDATO (mai consegnare una variante che viola un vincolo)
  se qualche c_j restituisce ignoto -> si dichiara "vincolo non verificato: c_j" e si prosegue solo con consenso
```

Proprieta' F1 (monotonia del filtro): togliere varianti non aggiunge varianti.
`c1 ⊆ c2` implica `FILTRA(V, c2) ⊆ FILTRA(V, c1)`.
Proprieta' F2 (nessuna resurrezione): una variante filtrata non rientra mai nel collasso.

I punteggi: `punteggio(v) = (correttezza, incastro, prestazioni, stile)` con l'ordine di priorita'
dichiarato in PROGETTO.md: correttezza prima di tutto (ordine lessicografico, non somma pesata).
La somma pesata e' scartata di proposito: nasconderebbe una violazione di correttezza dietro
prestazioni brillanti.

---

## 5. Il collasso deterministico

Definizione 5.1 (funzione di collasso).
`f_col(i, c, k, V', versioneRegole, entropia) -> v*`, con:
- `V'` : varianti filtrate, non vuoto
- `entropia` : il valore di entropia usato nella generazione (registrato), o il seme in modalita' stretta.

Algoritmo esatto (pseudocodice, identificatori in inglese come da PIANO):

```
collapse(i, c, k, V, rulesVersion, entropy):
  # passo 1: chiavi stabili per ogni variante
  keys = []
  for v in V:
    k_v = ( H(v.testo_canonico), v.id )
    keys.append(k_v)
  keys.sort_ascending()            # ordinamento stabile e totale (coppia di stringhe)

  # passo 2: payload canonico
  payload = canon( { intento: i,
                     vincoli: c,
                     contesto: k,
                     regole: rulesVersion,
                     varianti: keys } )

  # passo 3: selezione
  h = H(payload + "|" + entropy)
  idx = int(h[0:16], 16) mod length(keys)
  v_star = V[ keys[idx].id ]
  return v_star
```

Note di costruzione (ognuna serve al determinismo, sezione 6):
- Il testo canonico `v.testo_canonico` e' la variante dopo `canon()`: due varianti identiche a meno di
  spazi o ordine JSON hanno lo stesso hash. Cosi' non contano differenze invisibili.
- L'hash di ogni variante entra nel payload. Cambiare una virgola a una variante qualsiasi cambia
  il payload e quindi la selezione. Non e' un difetto: e' la firma del contesto completo.
- `int(h[0:16], 16) mod length(keys)` e' una funzione totale su `length(keys) >= 1`.
  Con `V'` vuoto la funzione non e' definita e si restituisce NESSUN_CANDIDATO (sezione 4).
- L'ordinamento e' per stringa esadecimale e poi per identificatore: totale, nessun pareggio.

Perche' mod e non "il migliore": il collasso non sceglie il punteggio piu' alto.
Sceglie in modo uniforme e riproducibile dentro lo spazio dei candidati che hanno passato
i filtri. La qualita' e' garantita dai filtri e dalla verifica (che bocciano, non dal collasso
che premia). Motivazione: un criterio "prendi il migliore" richiederebbe un punteggio unico,
e un punteggio unico e' arbitrario. Il filtro + verifica e' onesto e misurabile.

Nota scioccante ma vera: il collasso non deve massimizzare niente. Deve solo essere equo e
riproducibile. Il valore di WhyCode sta nei filtri, nella verifica e nella misura, non nell'elezione.

---

## 6. Teorema 1: determinismo del collasso

Teorema 1. Dati `(i, c, k, V', versioneRegole, entropia)` fissi, `f_col` restituisce sempre la stessa
variante. Stesso input registrato, stessa scelta. Sempre.

Prova (per costruzione).
1. `H` e' una funzione: stesso input, stesso digest. (Proprieta' di SHA-256 come funzione.)
2. `keys` dipende solo da `V'`: `sort_ascending()` su coppie di stringhe e' un ordinamento totale
   deterministico (nessun confronto ambiguo, nessun pareggio possibile: gli id sono unici).
3. `payload = canon(...)` e' una serializzazione canonica: la mappa dei campi non dipende dall'ordine
   di inserimento, i numeri sono normalizzati, i fine riga sono LF, la forma Unicode e' NFC.
4. `idx` e' il resto di una divisione fra interi, funzione totale.
5. Nessuna sorgente di entropia esterna entra nella funzione oltre al parametro `entropia`, che e'
   un input esplicito. Nessun orologio, nessun caso, nessuna rete. QED.

Corollario 1.1. In modalita' registrata, la riproduzione di una scelta richiede solo il record.
In modalita' stretta, `entropia = H(canon({i, c, k, versioneRegole}))` e serve solo l'input.
Corollario 1.2. Un osservatore con accesso al registro puo' verificare la scelta senza rifidarsi del sistema.

Nota di onesta': il determinismo vale sul collasso. La generazione delle varianti resta stocastica.
La frase "deterministico ma quantistico" e' letteralmente questa divisione dei ruoli.

---

## 7. Registro e replay: Teorema 2

Formato del record (riferimento completo in SPEC-03, qui solo il necessario):

```
record = {
  id:            "CL-<data>-<contatore>",
  timestamp:     ISO-8601 UTC,
  input:         canon({i, c, k, versioneRegole}),
  varianti:      [ {id, H(testo_canonico), punteggio} ... ],
  entropia:      hash del flusso di entropia di generazione (modalita' registrata)
  scelta:        v*.id,
  esito:         {L1..L5} al momento della consegna (o null),
  precedente:    H(record precedente),
  hash:          H(canon(tutto il resto di questo record))
}
```

Teorema 2 (replay fedele). Dato il registro integro, `REPLAY(record)` ricostruisce `v*` senza
rieseguire la generazione e verifica l'integrita' della catena.

Prova.
1. Il record contiene `input`, `varianti` con i loro hash, entropia e versione delle regole:
   tutti gli argomenti di `f_col` sono nel record.
2. `REPLAY` ricalcola `f_col` con quei valori (Teorema 1): stesso risultato.
3. Integrita': `precedente` lega il record al precedente. `hash` copre il contenuto.
   Qualsiasi modifica a un record rompe almeno un hash a valle: rilevabile. QED.

Corollario 2.1. Il registro e' a prova di manomissione silenziosa: si puo' falsificare solo
rifacendo la catena intera, e comunque la catena e' confrontabile con le copie di backup.

---

## 8. Apprendimento: modello, gate di validazione, Teorema 3

Definizione 8.1 (incontro). Un incontro e' un'esecuzione conclusa con esito registrato (verde o rosso)
e con gli errori classificati (SPEC-06, apprendimento dagli errori).

Definizione 8.2 (candidato di aggiornamento). `KB' = UPDATE(KB, incontro)`: nuova scheda,
nuovo idioma, nuova trappola, correzione di una voce esistente. Ogni voce porta provenienza e data.

Definizione 8.3 (gate di validazione). Sia `S_val` una suite di validazione tenuta fuori
dal flusso normale (mai usata come bersaglio diretto). Il gate accetta `KB'` se e solo se:

```
passRate(S_val, KB') >= passRate(S_val, KB) - epsilon
```

con `epsilon = 0` di default. L'eccezione: se `S_val` e' rumorosa (esecuzioni non identiche),
il confronto e' statistico: bootstrap sull'insieme dei task, e si accetta solo se l'intervallo
di confidenza al 95% della differenza non e' chiaramente negativo (sezione 10).

Teorema 3 (monotonicita' condizionata). Con il gate attivo, la prestazione di WhyCode su `S_val`
non peggiora mai in modo accettato. Formale: `passRate(S_val, KB_t)` e' non decrescente in `t`
a meno di `epsilon`, per ogni sequenza di aggiornamenti.

Prova (per induzione sulle iterazioni).
1. Base: `t = 0`, banale.
2. Passo: ogni transizione modifica la KB solo tramite il gate. Il gate accetta `KB'` solo se
   la condizione sopra vale. Quindi al passo `t+1`, `passRate` o sale o resta entro `epsilon`. QED.

Limiti dichiarati (importanti).
- L1. La monotonicita' vale SOLO su `S_val`. La generalizzazione a casi mai visti e' una proprieta'
  empirica: si misura, non si dimostra (dipende dal mondo, non da noi).
- L2. Una suite di validazione puo' essere "imparata a memoria": difesa = rotazione delle suite
  e controlli su dati freschi ogni N incontri.
- L3. Il gate protegge dal peggioramento, non garantisce il miglioramento. Il miglioramento si
  insegue con la cura delle schede, non si pretende.

---

## 9. Rumore linguistico: modello formale

Il test di accettazione di Whyed (sua frase):
> "far comprendere ogni parola ogni frase leggibile male da ogni lingua ma comprensibile"

Modello formale del "scritto male":
- Operazioni di rumore: sostituzione di un carattere, trasposizione di due caratteri adiacenti,
  cancellazione, inserimento, tasto adiacente sulla tastiera, errore fonetico (omofono probabile),
  accenti mancanti o sbagliati, maiuscole/minuscole, spaziatura sbagliata.
- Distanza: `d_sett(x, y)` = costo minimo di una sequenza di operazioni che trasforma `x` in `y`,
  con il costo per operazione pesato per tipo (una trasposizione costa meno di tre sostituzioni).

Requisito misurabile (R-rumore).
Per ogni frase di prova `y` (scritta correttamente) e per ogni `x` con `d_sett(x, y) <= 2`:
la comprensione di `x` deve restituire un Modello di Comprensione equivalente a quello di `y`,
con accuratezza misurata `>= 0.95` sulla suite di rumore (frasi vere, tre lingue di partenza:
italiano, inglese, spagnolo).

Difese progettate (tutte in SPEC-02):
1. Normalizzazione: prima di tutto, pulizia conservativa (spazi, accenti, maiuscole). Mai "correggere"
   il codice prima di capirlo: la normalizzazione agisce sul testo dell'utente, non sul codice.
2. Comprensione noiseless-aware: il modello nano addestrato con esempi rumorosi (direzione MulTypo).
3. Confidenza: ogni comprensione porta un livello di confidenza. Sotto la soglia, il sistema dichiara
   "non ho capito" invece di inventare. Il dichiarare e' obbligatorio, il capire no.
4. Ritorno alla forma: quando il rumore e' forte, si mostra la frase "capita" e si chiede conferma.

Onesta' (limite dichiarato): oltre `d_sett = 2` il requisito non esiste. Un testo distrutto non e' testo.
La soglia e' una decisione aperta (sezione 15).

---

## 10. Statistica della misura: "notevole" con numeri

La promessa di Whyed: "la risposta ha un'ottimizzazione di codice notevole".
Qui "notevole" diventa verificabile.

Setup di misura (dettaglio in SPEC-05):
- Task `t_1..t_n` rappresentativi del lavoro vero. Paired runs: before e after sulle stesse task,
  stesso ambiente (macchina, versione, carico). Mediana per task (robusta agli outlier).
- Metrica dominante: tempo di esecuzione (o dimensione, o memoria: una per volta, dichiarata prima).

Definizione 10.1 (miglioramento notevole). Un risultato e' notevole se:
1. su almeno una metrica dominante, il miglioramento medio e' `>= 10%` della baseline,
2. l'intervallo di confidenza al 95% del miglioramento e' tutto sopra zero,
3. nessun'altra metrica misurata peggiora oltre il 5% (con intervallo che esclude il caso),
4. `n >= n_min` (sotto).

Numeri minimi (formula):
```
n_min = ceil( (z * sd / delta)^2 )
z = 1.96 per CI 95%, sd = deviazione standard dei delta per task, delta = miglioramento atteso
Esempio: sd = 8%, delta = 5% -> n_min = ceil( (1.96*8/5)^2 ) = ceil(9.8) = 10 task.
Regola di sicurezza: mai meno di 10 task, mai meno di 3 ripetizioni per task.
```

Intervallo di confidenza: bootstrap sui task (10.000 ricampionamenti). Motivazione:
robusto su distribuzioni non normali (i tempi di esecuzione non lo sono quasi mai).

Confronti multipli: se si confrontano k regole o k varianti, la probabilita' di un falso positivo
cresce. Correzione di Benjamini-Hochberg per il controllo del tasso di falsi scoperti.
Regola dura: un numero senza intervallo di confidenza non esiste. Nel report appare "non misurato".

Peggioramenti: si registrano come i miglioramenti. Un peggioramento > 5% blocca la consegna
della regola (guardrail di SPEC-05).

Randomizzazione: se gira tutto su una macchina sola (il PC di Whyed), l'ordine before/after
viene alternato per assorbire derive termiche o di carico. La casualita' dell'ordine va registrata.

---

## 11. Verifica: calcolo a 5 livelli, soundness e limiti

Definizione 11.1 (esito). `esito = (L1, L2, L3, L4, L5)` con:
- L1 sintassi: il kernel parsea; il codice target compila o l'interprete lo accetta.
- L2 semantica statica: tipi, contratti, avvisi del linguaggio target; zero errori bloccanti.
- L3 test esistenti: la suite del repo ospite, prima e dopo (i rossi preesistenti si dichiarano, non si nascondono).
- L4 test generati: casi di bordo generati + property-based testing (proprieta': es. roundtrip, invarianti, idempotenza).
- L5 misura: benchmark con intervalli di confidenza (sezione 10).

Teorema 4 (soundness della consegna). Se `CONSEGNA` e' avvenuta, allora L1..L4 erano verdi
su test registrati e L5 e' dentro i numeri dichiarati. La consegna non mente su cio' che ha provato.

Prova. Per costruzione, `CONSEGNA` ha la guardia P2 (sezione 2): senza esito tutto verde non avviene.
L'esito e' registrato insieme alla consegna. Quindi "verde" nel record = "passato sui test elencati
nel record". QED.

Teorema 5 (limite di impossibilita'). WhyCode non puo' garantire la correttezza totale di un programma.
Nessuno puo' (problema della fermata e uguaglianza di programmi non decidibili). Percio':
1. ogni claim di WhyCode e' della forma "verificato su questi test, con questi numeri",
2. mai "corretto per sempre, per ogni input",
3. la verifica riduce il rischio. Non lo azzera. E' una rete, non una garanzia.

Corollario 5.1. Un sistema che promette correttezza totale mente o non ha capito il problema.
WhyCode dichiara il limite e vive bene dentro.

---

## 12. Complessita' e budget (degradazione controllata)

Costi nominali (n = dimensione input, V = varianti, T = test, B = benchmark):

| Fase | Costo | Nota |
|---|---|---|
| Tokenize kernel | O(n) | una passata, O(1) per carattere |
| Parse kernel | O(n) caso atteso | discesa ricorsiva, nessun backtracking esplosivo |
| Pretty-print | O(n) | stabile (SPEC-01, T-07) |
| Comprensione file (con grammatica) | O(parse) + chiamate modello con cache per hash | la cache e' per contenuto, non per percorso |
| Studio linguaggio da esempi | O(E * (proposta + prova + correzione)) | E = esempi, ciclo finito con criterio di stop |
| Generazione varianti | O(V * costo campione) | V dentro budget |
| Filtro vincoli | O(|c| * V * costo verifica vincolo) | pre-check economico prima di quello costoso |
| Collasso | O(V log V) | ordinamento + hash. Il collasso in se' costa quasi niente |
| Sintesi + incastro | O(profilo repo) + V * generazione | profilo calcolato una volta per repo, in cache |
| Verifica L3/L4 | O(T * durata test) | in sandbox, con timeout |
| Misura L5 | O(B * ripetizioni * durata) | campioni e ripetizioni di sezione 10 |

Budget globale e degradazione:
- Ogni fase ha un tetto di tempo e di token dichiarato all'inizio dell'esecuzione.
- All'80% del tetto il sistema dichiara "budget quasi finito" e riduce: meno varianti (V piu' piccolo),
  misure piu' corte, niente extra. Mai silenzioso.
- Al 100% la fase si chiude con quello che ha, marcando il risultato "parziale". Il risultato
  parziale e' legittimo, il risultato finto no.
- Il caso "lento per colpa dell'hardware" (PC con poca RAM) e' previsto: le soglie sono tarate
  per girare anche senza modello (regole pure), come da Fase 0.

---

## 13. Invarianti globali (I1..I12) e come si testano

Un invariante e' una proprieta' che vale SEMPRE, in ogni esecuzione, e che ha un test automatico.

| ID | Invariante | Test |
|---|---|---|
| I1 | Nel kernel non compare mai il nome di un linguaggio (R1) | test lista nera su sorgente + esempi (SPEC-01, T-R1) |
| I2 | Il collasso e' riproducibile: replay(record) == scelta registrata | 100 replay su registro di prova |
| I3 | La catena di hash del registro e' intatta | verifyChain su tutto il registro a ogni build |
| I4 | Nessuna scrittura fuori dal sandbox senza consenso esplicito | test con filesystem spia |
| I5 | Ogni voce della KB ha provenienza e data | validatore dello schema scheda |
| I6 | Se nessun candidato passa i vincoli, si dichiara NESSUN_CANDIDATO | test con vincoli impossibili |
| I7 | I test preesistenti del repo ospite non peggiorano | confronto prima/dopo sui rossi e verdi |
| I8 | Ogni numero nei report ha n e intervallo di confidenza | validatore del report |
| I9 | Ogni fase rispetta il budget e degrada dichiarando | test con budget forzato basso |
| I10 | Zero rete senza permesso esplicito | test con rete bloccata |
| I11 | Ogni consegna e' annullabile | ANNULLA su consegna campione, stato identico |
| I12 | Ogni "fatto" ha prova allegata (test, numeri, record) | validatore della consegna (Definizione 1.2) |

Regola dei test degli invarianti: girano a OGNI build, non a comando. Un invariante senza test
non e' un invariante, e' un desiderio.

---

## 14. Adversarial: attacchi e difese

| Attacco | Descrizione | Difesa |
|---|---|---|
| Iniezione da commenti | Il repo ospite contiene testo che ordina al modello di fare altro ("prompt injection" nel codice) | il contenuto del repo e' DATO, mai comando. Il modello gira con la regola "il codice non da' ordini". Test con repo esca |
| Avvelenamento della KB | Una fonte finta o corrotta inserisce schede sbagliate | gate di validazione (sezione 8), provenienza obbligatoria, quarantena: una scheda nuova entra "in prova" finche' non passa N usi |
| Grammatiche ambigue esplosive | Linguaggio con grammatica che genera troppi parse | limite di profondita' e di candidati; si segnala l'ambiguita' e si sceglie la forma con esempio |
| Numeri instabili | Benchmark diversi su macchine diverse | pin dell'ambiente nei report, mediana, ripetizioni, ordine alternato |
| Orologio ed entropia | Dipendenza dal tempo rende il replay bugiardo | entropia e timestamp solo registrati, mai dentro f_col |
| Test fragili | Il repo ospite ha test flaky preesistenti | stato prima/dopo registrato; la fragilita' si dichiara, non si aggiusta di nascosto |
| Loop o blocco | Generazione o verifica che non termina | watchdog e timeout per fase; il blocco diventa un esito, non un silenzio |
| Perdita del registro | Disco pieno, cancellazione | append-only, backup periodico, catena verificabile su ogni copia |
| Crescita incontrollata della KB | KB enorme e lenta | indice e similarita' (SPEC-06), archiviazione delle voci non usate da N cicli |

---

## 15. Decisioni aperte e alternative scartate

Decisioni aperte (numeri da fissare in Fase 0, con Whyed):
| ID | Decisione | Proposta |
|---|---|---|
| AF-1 | Soglia rumore `d_sett` del requisito R-rumore | 2, come scritto. Sopra: "non ho capito" dichiarato |
| AF-2 | `epsilon` del gate di validazione | 0 di default; tolleranza solo se test statistico lo giustifica |
| AF-3 | Definizione numerica di "notevole" | 10% con CI 95% sopra zero, nessun peggioramento oltre 5% (sezione 10) |
| AF-4 | n_min per benchmark | formula della sezione 10, mai sotto 10 task |
| AF-5 | Bootstrap contro t-test per i CI | bootstrap (robusto, non normale) |
| AF-6 | Quarantena delle schede nuove | N = 5 usi riusciti prima di "scheda stabile" |
| AF-7 | Modalita' stretta come default? | no: default registrata. Stretta per i test |

Alternative scartate:
| Alternativa | Perche' scartata |
|---|---|
| Collasso che sceglie sempre il punteggio massimo | richiede un punteggio unico totale, arbitrario; i filtri e la verifica bastano |
| Somma pesata dei criteri (correttezza + prestazioni insieme) | una violazione di correttezza si nasconderebbe dietro prestazioni brillanti |
| Determinismo anche sulla generazione | ucciderebbe la varieta' delle varianti: meno candidati, meno confronto misurato |
| Promessa di correttezza totale | impossibile (Teorema 5): chi la promette mente |
| Misure senza intervalli di confidenza | rumore scambiato per risultato. Vietato dal report (I8) |
| Formule segrete nel collasso | verificabilita' totale: un osservatore esterno puo' rifare tutto |
| Apprendimento senza gate | la KB puo' peggiorare senza accorgersene; il gate e' la cintura |

---

## Registro delle modifiche

| Data | Modifica | Autore |
|---|---|---|
| 17/10/2026 | Prima stesura completa (15 sezioni, 5 teoremi, 12 invarianti) | agente WhyCode |

Fine del documento.
