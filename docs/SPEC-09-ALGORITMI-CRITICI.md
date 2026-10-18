# SPEC-09: Algoritmi critici di WhyCode (pseudocodice)

Stato: prima stesura completa, 17/10/2026. Da approvare in Fase 0.
Fonti: SPEC-01..08, PIANO-IMPLEMENTAZIONE.md, PROGETTO.md.
Scopo: scrivere gli algoritmi veri, quelli che il codice implementera' parola per parola.
Regola di lettura: ogni algoritmo ha firma, pre/post condizioni, pseudocodice, complessita',
test obbligatori, errori tipici. Pseudocodice in stile chiaro, identificatori in inglese (come da PIANO),
commenti in italiano semplice.

Avvertenza sui bug: lo pseudocodice di questo documento e' la fonte primaria dell'implementazione.
Quando il codice reale divergera', la divergenza va motivata qui, nel registro delle modifiche.

---

## 0. Convenzioni

- `H(x)`: SHA-256 di x. `canon(x)`: serializzazione canonica (SPEC-08, sezione 1).
- Gli esiti sono valori espliciti: `OK`, `PARZIALE`, `ERRORE_<CODICE>`. Mai eccezioni crude (SPEC-01).
- Ogni funzione pura dove puo'. Lo stato vive nei file (SPEC-01, PIANO).
- I test citati per nome sono obbligatori: un algoritmo senza test non si considera scritto.
- La sandbox: ogni esecuzione di codice non fidato avviene li' dentro, con timeout e senza rete (SPEC-04).
- I nomi dell'approccio: WhyStocastic (generazione, sezioni 4-8) e WhyQuantum (collasso e replay, sezioni 9-10).
  La memoria (sezione 14) e' il ponte con WhyConsciousness.

---

## 1. tokenize: dal testo ai gettoni

**Firma**: `tokenize(source: string) -> Esito<Token[]>`

Ingressi: sorgente `.why` (UTF-8, LF o CRLF).
Uscite: lista di gettoni con posizione (riga, colonna) oppure errore K-001..K-005 con posizione.
Precondizioni: nessuna. Il tokenizer accetta qualsiasi testo e non lancia mai eccezioni.

```
tokenize(source):
  normalizza fine riga a LF (tieni traccia dell offset originale)
  i = 0; tokens = []
  mentre i < lunghezza(source):
    c = source[i]
    se c e' #            -> consuma fino a LF, emetti COMMENTO
    se c e' "            -> leggi testo: gestisci escape \n \t \" \\;
                            se arriva LF prima della chiusura -> ERRORE K-004 (riga, colonna)
    se c e' cifra        -> leggi numero: cifre, poi eventuale "." e cifre
    se c e' lettera      -> leggi parole: lettere (anche accentate), cifre, trattino basso;
                            se la parola e' riservata (SPEC-01, sezione 9) -> gettone PAROLA_CHIAVE
    se c e' simbolo      -> prova i simboli a due caratteri prima (<, >, <=, >=, ->, ==?);
                            poi quelli a un carattere ( { } ( ) [ ] : , + - * / % < > = )
    se c e' spazio/riquadro -> avanza
    altrimenti           -> ERRORE K-001 con riga, colonna, carattere
  emetti gettone FINE
  return OK(tokens)
```

Complessita': O(n), una passata, memoria O(gettoni).
Test obbligatori: TOK-01 tutti i simboli; TOK-02 escape e testi non chiusi; TOK-03 numeri
e decimali; TOK-04 parole riservate contro identificatori; TOK-05 CRLF e LF danno gli stessi gettoni;
TOK-06 accentate nei nomi; TOK-07 posizione esatta su 20 input rotti.
Errori tipici: dimenticare che `-` e' anche inizio di `->`; trattare i numeri come testo.

---

## 2. parse: dai gettoni all'albero

**Firma**: `parse(tokens: Token[]) -> Esito<KernelAst>`

Ingressi: gettoni del tokenizer.
Uscite: albero sintattico o errore K-002/K-003/K-005 con posizione e suggerimento.
Precondizioni: gettoni validi (dal tokenizer).

```
parse(tokens):
  parser = nuovo Parser(tokens)      # indice current, lista errori
  file = []
  mentre non FINE:
    blocco = parseTopLevel(parser)   # sceglie in base alla parola chiave corrente
    se blocco e' errore:
      recupera(parser)               # panic mode, vedi sotto
    altrimenti file.append(blocco)
  se errori vuoto -> OK(file) altrimenti ERRORE(primo errore con lista completa)

parseTopLevel(parser):
  guarda la parola chiave corrente (versione, intento, vincoli, uscita, dialetto, usa,
                                   tipo, funzione, effetto, test, importa, dato, vincolo)
  chiama la produzione corrispondente delle regole G-001..G-026 (SPEC-01)
  ogni produzione consuma i gettoni attesi e segnala con posizione cio' che manca

recupera(parser):                    # modalita' panico
  scarta gettoni finche' non trovi:
    - una graffa di chiusura al livello giusto, oppure
    - una parola chiave di inizio blocco
  registra UN errore (mai cascate: un errore per punto, SPEC-01)
```

Complessita': O(n) caso atteso. La discesa ricorsiva senza backtracking regge perche' la grammatica
e' progettata con prefissi distinguibili (prima parola = produzione). Ambiguita' residua: nessuna nota
(la forma `atteso espressione` di SPEC-01, N10, elimina il caso peggiore).
Test obbligatori: PAR-01 i 12 esempi di SPEC-01; PAR-02 errore con riga e colonna su 10 file rotti;
PAR-03 un errore per punto, niente cascate; PAR-04 recupero: file con due errori distanti
produce due errori e i blocchi sani restano.
Errori tipici: consumare un gettone "per sbaglio" e sbagliare tutte le posizioni a valle;
trasformare il recupero in un loop infinito (garanzia: ogni ramo di recupero avanza almeno un gettone).

---

## 3. prettyPrint: l'albero torna testo, stabile

**Firma**: `prettyPrint(ast: KernelAst) -> string`

Ingressi: albero valido. Uscita: testo `.why` canonico.
Proprieta' (SPEC-01, T-04/T-07): `parse(prettyPrint(parse(x))) == parse(x)` e due passaggi di stampa
danno lo stesso testo.

```
prettyPrint(ast):
  per ogni blocco: stampa intestazione, poi corpo con 2 spazi per livello
  - blocchi vuoti: "nome {\\n}" (graffe su righe proprie)
  - righe corte: una istruzione per riga
  - testi: escape canonici (\\n, \\t, \\" , \\\\)
  - numeri: forma normale (niente zeri finali, niente -0)
  - fine riga: sempre LF
  - commenti: conservati dove stanno (il pretty-print non li butta mai)
  return testo
```

Complessita': O(n). Test obbligatori: PP-01 roundtrip su 20 file; PP-02 stabilita' (doppio passaggio);
PP-03 commenti conservati; PP-04 LF anche partendo da CRLF.
Errori tipici: perdere i commenti (grave: sono documentazione dell'utente); numeri riscritti
in forme diverse (1.50 diventa 1.5).

---

## 4. studyLanguage: studiare un linguaggio al momento

**Firma**: `studyLanguage(samples: Esempio[], tempoMax, budgetGettoni) -> Esito<SchedaLinguaggio>`

Ingressi: esempi (positivi e, se ci sono, negativi), documentazione libera, tetto di tempo e gettoni.
Uscita: scheda linguaggio (SPEC-06) con grammatica inferita, confidenza, provenienza; oppure PARZIALE dichiarato.
Precondizioni: nessuna conoscenza del linguaggio e' precaricata. Questo e' il punto: non sapere.

Il ciclo (metodo Kajal, adattato):
```
studyLanguage(samples, tempoMax, budgetGettoni):
  separa samples in: allenamento (80%) e verifica (20%), stratificato
  grammatica = propostaIniziale(model, allenamento)      # BNF candidata
  ripeti fino a criterio di stop:
    parser = costruisciParserDaGrammatica(grammatica)
    esiti = per ogni esempio di allenamento: parser.parse(esempio)
    rotti = esempi con errore (con messaggio del parser)
    se rotti vuoto:
      # prova sulla verifica (dati mai visti nel ciclo)
      se parser.parse(verifica) tutto OK -> confidenza = alta; esci
    nuoviEsempi = campione(verifica, k) con i rotti        # i nuovi dati entrano con peso
    proposta = model.correggi(grammatica, rotti, nuoviEsempi, eventualiNegativi)
    se proposta == grammatica: esci (convergenza, confidenza media)
    grammatica = proposta
    se tempoMax o budgetGettoni esauriti: esci (PARZIALE dichiarato)
  scrivi SchedaLinguaggio(grammatica, confidenza, metriche, provenienza)
  return esito con confidenza dichiarata
```

Criterio di stop (tutti, il primo che scatta):
1. verifica tutta verde: confidenza alta.
2. due giri senza cambiamento: confidenza media, dichiarata.
3. budget finito: PARZIALE, la scheda resta "in prova" (quarantena).
4. tetto di giri raggiunto (default 10): PARZIALE dichiarato.

Complessita': O(giri * (E * parse + chiamate modello)). Il costo del modello domina; la cache
per hash di (grammatica, esempio) evita di ripagare gli stessi errori.
Test obbligatori: STU-01 mini linguaggio inventato (3 esempi) capito e parsato al 100% su verifica;
STU-02 DSL con commenti strani; STU-03 caso impossibile: si chiude PARZIALE e lo dice;
STU-04 lo stop per budget non produce mai una scheda "stabile" (resta in quarantena).
Errori tipici: far vedere la verifica al modello (overfitting); contare "parse verde" senza
controllare che l'albero abbia senso semantico (il ciclo comprende anche controlli basilari).

---

## 5. comprehend: capire un sorgente

**Firma**: `comprehend(source: string, kb: KB) -> Esito<ModelloComprensione>`

Ingressi: sorgente di qualsiasi linguaggio (noto o studiato al momento), KB con schede.
Uscita: Modello di Comprensione (SPEC-02, formato JSON) con confidenza per campo.
Precondizioni: nessuna. Il flusso decide da solo se serve studiare prima.

```
comprehend(source, kb):
  chiave = H(canon(source)); se in cache -> return cache[chiave]

  # 1. riconoscimento
  impronta = fingerprint(source)          # euristiche + schede KB
  scheda = kb.find(impronta)

  # 2. parsing
  se scheda esiste:
    ast = parseConGrammatica(scheda.grammatica, source)
  altrimenti:
    risultato = studyLanguage(campione(source), budgetRidotto)
    se non ha parsato tutto -> modalita' tollerante (vedi punto 5)

  # 3. normalizzazione
  uast = normalizeUAST(ast, scheda)

  # 4. semantica (chiamate modello, con budget)
  semantica = model.estrai({ intenzioni, contratti, invarianti, casi_bordo, tipi, errori })
  # 5. rumore
  se sorgente indica testo umano (intento/natural language): applica pipeline rumore (SPEC-02)
  confidenza = stimaConfidenza(uast, semantica)
  modello = assembla(uast, semantica, confidenza, provenienza)
  cache[chiave] = modello
  return modello
```

Regola dei buchi: se la confidenza di un campo scende sotto la soglia, il campo si marca
`"non capito"`. Mai inventare. Il modello di comprensione puo' essere parziale e lo dichiara.
Complessita': O(parse + chiamate modello). Dominante: il modello. Cache per contenuto.
Test obbligatori: COM-01 sorgente noto (grammatica vera); COM-02 sorgente di linguaggio mai visto
(da scheda in quarantena); COM-03 frase umana scritta male (3 lingue, d_sett <= 2, accuratezza >= 0.95);
COM-04 campo incerto marcato "non capito"; COM-05 cache: secondo giro identico non richiama il modello.
Errori tipici: dichiarare capito cio' che non lo e'; usare la cache sul percorso invece che sul contenuto.

---

## 6. normalizeUAST: l'albero universale

**Firma**: `normalizeUAST(ast: KernelAst|TreeSitterAst, scheda: Scheda) -> UAST`

Ingressi: albero concreto. Uscita: UAST con le 30 etichette universali (SPEC-02, sezione 5).
Precondizioni: albero valido.

```
normalizeUAST(ast, scheda):
  uast = albero vuoto
  per ogni nodo in visita(ast) (ordine deterministico: pre-ordine, figli in ordine sorgente):
    etichetta = scheda.mappa(nodo.tipo)          # tabella di corrispondenza della scheda
    se etichetta assente:
      etichetta = "contenitore" o "sconosciuto"  # mai scartare: si conserva con provenienza
    attributi = { testo: nodo.testo, riga, colonna, specifico: nodo.tipo }
    uast.append(Nodo(etichetta, attributi, figli normalizzati))
  return uast
```

Invarianti: l'ordine dei figli e' quello del sorgente (mai riordinare: la semantica di ordine conta);
ogni nodo porta la provenienza (tipo concreto + posizione); la mappa vive nella scheda, mai nel kernel.
Complessita': O(nodi). Test obbligatori: UAS-01 stesse etichette per sorgenti equivalenti;
UAS-02 ordine conservato; UAS-03 nodo sconosciuto conservato, non buttato.
Errori tipici: normalizzare troppo (perdere l'informazione specifica che serve alla sintesi);
normalizzare poco (etichette per linguaggio, non universali).

---

## 7. generateVariants: lo spazio delle possibilita'

**Firma**: `generateVariants(i, c, k, L, kb, budget) -> Esito<Variante[]>`

Ingressi: intento, vincoli, contesto, linguaggio, KB, budget.
Uscita: da 1 a V varianti, ognuna con testo, provenienza, parametri di campionamento.
Precondizioni: esiste una comprensione dell'intento (ModelloComprensione).

```
generateVariants(i, c, k, L, kb, budget):
  piano = pianificaCampione(budget)       # n, temperatura, strategie (diverse seed/stili)
  varianti = []
  per ogni strategia del piano:
    prompt = costruisciPrompt(i, c, k, L, kb, strategia)
    testi = model.genera(prompt, n = strategia.n, temperature, top_p)   # STOCASTICO qui
    per ogni testo:
      se parse(testo) ok:                 # valida col kernel prima di tutto
        varianti.append(Variante(testo, strategia, parametri))
  # diversita'
  varianti = dedup(varianti, chiave = H(testo_canonico))
  se varianti > Vmax: varianti = selezionaDiverse(varianti, Vmax)   # per hash, non per caso
  return OK(varianti) o ERRORE K se zero varianti (dichiarato, mai nascosto)
```

Nota: la generazione e' l'unica fase stocastica (SPEC-08, sezione 3). I parametri di campionamento
vanno registrati con le varianti, per il replay. Complessita': O(V * costoGenerazione).
Test obbligatori: GEN-01 V varianti tutte parsabili; GEN-02 zero varianti -> errore dichiarato;
GEN-03 dedup: varianti identiche a meno di spazi contano una sola; GEN-04 budget: mai oltre Vmax.
Errori tipici: selezionare "le migliori" qui (spetta al filtro e alla misura, non alla generazione);
non validare col kernel subito (varianti rotte entrano nello spazio).

---

## 8. checkConstraints: il filtro dei vincoli

**Firma**: `checkConstraints(varianti: Variante[], c: Vincolo[]) -> Esito<FiltroRisultato>`

Ingressi: varianti, vincoli. Uscita: varianti compatibili + elenco violazioni e "ignoti".

```
checkConstraints(varianti, c):
  ordina i vincoli dal piu' economico al piu' costoso (euristica dichiarata)
  V' = []; violazioni = []; ignoti = []
  per ogni v in varianti:
    esito_v = vero
    per ogni c_j in c:
      r = valuta(c_j, v)                 # {vero, falso, ignoto}
      se r == falso: esito_v = falso; violazioni.append((v, c_j)); break
      se r == ignoto: ignoti.append((v, c_j))    # non blocca ma si dichiara
    se esito_v: V'.append(v)
  se V' vuoto -> ERRORE NESSUN_CANDIDATO (SPEC-08, sezione 4)
  return OK({ V', violazioni, ignoti })
```

Complessita': O(|c| * V * costo). Con pre-check per vincoli comuni (tipo, dimensione) prima dei costosi.
Test obbligatori: FIL-01 vincolo impossibile -> NESSUN_CANDIDATO; FIL-02 ignoto dichiarato e non nascosto;
FIL-03 ordine economico rispettato (conteggio valutazioni nei test).
Errori tipici: trattare "ignoto" come "vero" senza dirlo; valutare tutti i vincoli su tutte le varianti
(costo inutile).

---

## 9. collapse: la decisione, registrata

**Firma**: `collapse(i, c, k, V', versioneRegole, entropia) -> Esito<{scelta, record}>`

Ingressi: come sezione 5 di SPEC-08. Uscita: variante scelta + record completo da appendere al registro.
Precondizioni: V' non vuoto (guardia: se vuoto, non si chiama).

```
collapse(i, c, k, V, rulesVersion, entropy):
  keys = sort_ascending( [ (H(v.testo_canonico), v.id) per v in V ] )
  payload = canon({intento: i, vincoli: c, contesto: k, regole: rulesVersion, varianti: keys})
  h = H(payload + "|" + entropy)
  idx = int(h[0:16], 16) mod length(keys)
  scelta = V[ keys[idx].id ]

  record = { id: nuovoIdRegistro(), timestamp: utc(), input: canon({i, c, k, rulesVersion}),
             varianti: [ {id, hash, punteggio} per v in V ],
             entropia: entropy, scelta: scelta.id, esito: null,
             precedente: H(ultimoRecord) o "GENESI" }
  record.hash = H(canon(record senza hash))
  appendi(registro, record)            # append-only
  return OK({scelta, record})
```

Regole duplicate di proposito (checklist di implementazione):
1. nulla di esterno entra nella scelta: solo i parametri (SPEC-08, Teorema 1);
2. l'ordinamento e' totale: coppie (hash esadecimale, id), mai pareggi;
3. la scrittura del record e' l'ULTIMO passo: prima si sceglie, poi si registra. Se il registro fallisce,
   l'esecuzione si annulla (niente scelte non registrate).
Complessita': O(V log V). Test obbligatori: COL-01 100 replay identici; COL-02 cambiare un byte
a una variante cambia la scelta (atteso: e' la firma del contesto); COL-03 registro append-only
(verifica catena); COL-04 V vuoto: mai arrivare qui (guardia testata a monte).
Errori tipici: usare il tempo come input della scelta (rompe il replay); scrivere il record
in un formato non canonico (rompe la verifica).

---

## 10. replayAndVerify: fidarsi si', ma verificare

**Firma**: `replayAndVerify(idRecord: string) -> Esito<{scelta, catenaOk}>`

```
replayAndVerify(idRecord):
  record = registro.find(idRecord)
  payload = canon(record.input + record.varianti + record.regole?)
  h = H(payload + "|" + record.entropia)
  idx = int(h[0:16], 16) mod length(record.varianti)
  sceltaAttesa = record.varianti[ keys[idx].id ]
  catenaOk = verifyChain(registro)     # ricalcola tutti gli hash da GENESI
  se sceltaAttesa == record.scelta e catenaOk -> OK
  altrimenti ERRORE DETTAGLIATO (quale record, quale hash rotto)
```

Complessita': O(V + lunghezza registro) per la catena completa; O(V) per il singolo replay.
Test obbligatori: REP-01 registro di prova con 1000 record: catena ok; REP-02 record manomesso:
rilevato con il punto esatto; REP-03 replay su record di esecuzioni diverse: ognuno coerente.
Errori tipici: verificare la catena solo sugli ultimi record (la manomissione puo' essere vecchia).

---

## 11. synthesize: il compositore con incastro

**Firma**: `synthesize(v: Variante, k: Contesto, L: Linguaggio) -> Esito<Artefatto>`

Ingressi: variante scelta, contesto (repo ospite), linguaggio.
Uscita: codice concreto per L, incastrato nello stile del repo, con provenienza.
Precondizioni: profilo di stile del repo disponibile (calcolato una volta per repo, in cache).

```
synthesize(v, k, L):
  profilo = profiloStile(k.repo)         # una volta sola per repo
  # il profilo contiene: convenzioni nomi, pattern ricorrenti, librerie presenti, stile errori,
  # formattazione, struttura file. E' misurato, non indovinato.
  artefatto = model.generaCodice({
    variante: v, profilo: profilo, linguaggio: L,
    regole: [ "non inventare API: solo esistenti nel repo o nella libreria standard dichiarata",
              "segui le convenzioni del profilo", "commenti solo dove il repo li usa" ] })
  # autocheck rapido PRIMA di uscire (i livelli pieni stanno in verifyLevels)
  se non compila (L1) o ha errori statici (L2): prova una riparazione guidata dal messaggio d'errore
  se dopo 2 riparazioni ancora rosso: PARZIALE dichiarato con il messaggio esatto
  return artefatto con provenienza (variante, profilo, modello)
```

Complessita': O(profilo) + O(generazione). Il profilo si calcola una volta: costo riuso.
Test obbligatori: SYN-01 artefatto che segue il profilo (nomi e formattazione);
SYN-02 API inventata: rilevata e fermata prima della consegna; SYN-03 riparazione: errore semplice
risolto in 1 giro; SYN-04 PARZIALE dichiarato dopo 2 giri falliti, mai finto verde.
Errori tipici: generare "bello" e fuori stile (rompe l'incastro); inventare funzioni che sembrano plausibili.

---

## 12. verifyLevels: i 5 livelli

**Firma**: `verifyLevels(artefatto: Artefatto, k: Contesto) -> Esito<Esito5>`

```
verifyLevels(artefatto, k):
  L1 = compila(artefatto)                     # sandbox
  se L1 rosso -> return ESITO(L1 rosso, motivo)
  L2 = analisiStatica(artefatto)               # tipi, contratti, avvisi bloccanti
  L3 = testOspite(artefatto, k.repo, before=statoPrima, after=statoDopo)
       # i test rossi preesistenti si classificano PRIMA (I7): mai colpa nostra, mai nascosti
  L4 = testGenerati(artefatto)
       # a) casi di bordo dal Modello di Comprensione (bordi, vuoti, errori)
       # b) property-based: proprieta' dichiarate dai contratti (roundtrip, idempotenza, invarianti)
  # L5 non si esegue qui: la misura ha la sua fase (sezione 13) perche' costa
  return ESITO(L1, L2, L3, L4)
```

Regole: ogni livello produce un referto con: esito, comando eseguito, durata, primo errore.
Il verde di L3 "prima" e "dopo" e' registrato: il confronto e' il vero risultato.
Complessita': dominio dei test. Test obbligatori: VER-01 artefatto rotto fermato a L1;
VER-02 tipo sbagliato fermato a L2; VER-03 il rosso preesistente non contamina il verdetto;
VER-04 property-based trova un bug vero seminato apposta; VER-05 timeout e sandbox: nessuna uscita.
Errori tipici: eseguire test generati senza sandbox (mai); confondere L2 avvisi con errori.

---

## 13. measureAndOptimize: il "notevole" con numeri

**Firma**: `measureAndOptimize(artefatto, suite, regole) -> Esito<Report>`

```
measureAndOptimize(artefatto, suite, regole):
  # 1. baseline
  before = eseguiSuite(suite, artefatto.originale)      # paired runs
  # 2. candidati
  candidati = applicaRegole(artefatto, regole, max = budget.candidati)
  # 3. misure per candidato
  per ogni candidato: after_i = eseguiSuite(suite, candidato)  # ordine before/after alternato
  # 4. statistiche (SPEC-08, sezione 10)
  delta = mediana(after) - mediana(before) per task
  CI = bootstrap(delta, 10000)
  correggiConBenjaminiHochberg(se k regole > 1)
  # 5. gate di notevole
  se CI.inferiore > 0 e miglioramento >= 10% e nessun peggioramento > 5% (con CI):
    accetta il candidato
  altrimenti scarta e registra ("non notevole: numeri")
  # 6. report
  report = {before, after, delta, CI, n, ripetizioni, ambiente, ordine, esito}
  return Report
```

Regola dura: senza numeri, "notevole" non esiste. Il report contiene SEMPRE n e CI (invariante I8).
Complessita': O(B * rip * durata). Test obbligatori: OTT-01 miglioramento vero rilevato;
OTT-02 rumore puro scartato (niente falsi positivi con CI); OTT-03 peggioramento > 5% blocca;
OTT-04 report con n e CI sempre presenti; OTT-05 ambiente pinnato nel report.
Errori tipici: girare misure in parallelo su macchine cariche (inquinano); dimenticare la sonda termica
(ordine alternato) sulle misure lunghe.

---

## 14. learnFromError: la memoria che cresce

**Firma**: `learnFromError(incontro: Incontro, kb: KB, S_val: Suite) -> Esito<KB'>`

```
learnFromError(incontro, kb, S_val):
  # 1. classificazione
  categoria = classifica(incontro.errore)
    # categorie: grammatica sbagliata, idioma mancante, trappola del linguaggio,
    #            rumore umano, vincolo non rispettato, errore del modello, errore di misura
  # 2. proposta
  KB' = proponiAggiornamento(kb, incontro, categoria)
  # 3. gate (SPEC-08, sezione 8)
  se passRate(S_val, KB') >= passRate(S_val, kb) - epsilon (o test statistico):
    applica KB', marca provenienza; nuova voce -> quarantena (in prova per N usi)
    return OK(KB')
  altrimenti:
    scarta, registra il rifiuto con motivo (anche il rifiuto e' conoscenza)
    return OK(kb) invariata con nota
```

Test obbligatori: LER-01 aggiornamento buono applicato; LER-02 aggiornamento che peggiora:
respinto dal gate; LER-03 quarantena: la scheda nuova non e' "stabile" prima di N usi;
LER-04 rifiuto registrato (non silenzioso).
Errori tipici: aggiornare la KB senza gate (monotonicita' persa); non registrare i rifiuti.

---

## 15. orchestrate: l'intera esecuzione, dall'intento alla consegna

**Firma**: `orchestrate(i, c, k, budgetGlobale) -> Esito<Consegna>`

```
orchestrate(i, c, k, budget):
  comprensione = comprehend(contesto + sorgenti, kb)
  varianti = generateVariants(i, c, k, L, kb, budget.genera)
  filtro = checkConstraints(varianti, c)
  se filtro e' NESSUN_CANDIDATO: return esito dichiarato (mai consegnare)
  {scelta, record} = collapse(i, c, k, filtro.V', versioneRegole, entropia())
  artefatto = synthesize(scelta, k, L)
  esito4 = verifyLevels(artefatto, k)
  se esito4 non tutto verde: stop con referto completo (il record esiste: replay sempre possibile)
  report = measureAndOptimize(artefatto, suite, regoleRegistrate)
  se report.ok:
    consegna = {codice, test, benchmark, record}
    record.esito = esito4 + report.ok
    aggiorna(registro, record)         # append della chiusura
    return OK(consegna)
  altrimenti: stop con referto; la KB non si tocca se non tramite learnFromError (sezione 14)
```

Regole di orchestrazione:
1. Ogni fase ha budget proprio; l'80% degli avvisi, il 100% chiude con PARZIALE dichiarato.
2. Ogni stop non e' un fallimento muto: produce un referto con dove e perche'.
3. La consegna e' l'unica uscita "verde" possibile (Definizione 1.2 di SPEC-08).
4. Ordine non negoziabile: comprensione, generazione, filtro, collasso, sintesi, verifica, misura.
   Ogni scorciatoia proposta va motivata in questo documento.
Complessita' totale: dominio del modello + verifica + misura; le cache per hash (comprensione, profilo)
abbassano il costo dei giri successivi sullo stesso repo.
Test obbligatori: ORK-01 percorso completo verde su caso piccolo; ORK-02 stop a ogni fase con referto;
ORK-03 replay di ogni esecuzione registrata; ORK-04 budget forzato: degradazione dichiarata;
ORK-05 la consegna contiene SEMPRE {codice, test, benchmark, record} (validatore I12).
Errori tipici: fase che scrive nei file senza passare dal gate; consegna senza benchmark.

---

## Appendice A: mappa algoritmo -> specifica

| Algoritmo | Specifica madre |
|---|---|
| tokenize, parse, prettyPrint | SPEC-01 (grammatica, errori K) |
| studyLanguage | SPEC-02 (sezione 4), PIANO (Fase 1) |
| comprehend, normalizeUAST | SPEC-02 (sezioni 5-7) |
| generateVariants, checkConstraints, collapse, replayAndVerify | SPEC-03, SPEC-08 (sezioni 3-7) |
| synthesize | SPEC-04 (sezioni 2-5) |
| verifyLevels | SPEC-04 (sezione 6), SPEC-08 (sezione 11) |
| measureAndOptimize | SPEC-05, SPEC-08 (sezione 10) |
| learnFromError | SPEC-06, SPEC-08 (sezione 8) |
| orchestrate | tutte, piu' PIANO (Fasi 0-5) |

## Appendice B: glossario minimo

- Variante: candidato di codice per un intento. Piu' varianti coesistono (superposizione).
- Collasso: la scelta finale riproducibile, registrata con catena di hash.
- Gate: la guardia che impedisce alla KB di peggiorare.
- Nota: termine non definito qui = definito in SPEC-08 sezione 1.

---

## Registro delle modifiche

| Data | Modifica | Autore |
|---|---|---|
| 17/10/2026 | Prima stesura completa (15 algoritmi, appendici) | agente WhyCode |

Fine del documento.
