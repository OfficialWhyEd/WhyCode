# SPEC-02: Comprensione (Livello 1 di WhyCode)

Stato: bozza completa del 17/10/2026.
Prerequisito: PROGETTO.md (visione approvata).
Documenti collegati: SPEC-06 (knowledge base, formato delle schede), registro dei collassi (WhyObliter style).

---

## 1. Scopo e flusso end-to-end

Il Livello 1 (Comprensione) riceve in ingresso qualsiasi cosa possa descrivere
un linguaggio o un pezzo di codice e produce un **Modello di Comprensione**:
una rappresentazione di cosa fa il codice, indipendente dal linguaggio di partenza.

WhyCode non conosce i linguaggi in anticipo. Li studia al momento.
Questo documento descrive come. Ogni passo e' misurabile e registrato.
Niente cloud obbligatorio: tutto gira in locale con WhyLocalLM.

### 1.1 Schema dei passi

    INPUT
      |
      v
    [P0] Ricezione e classificazione     (capire che tipo di input e')
      |
      v
    [P1] Acquisizione del linguaggio     (parser reale / grammatica inferita / grammatica fornita / niente sintassi)
      |
      v
    [P2] Parsing e albero concreto       (AST o CST, con posizioni e nodi di errore)
      |
      v
    [P3] Normalizzazione UAST            (etichette semantiche universali + attributi nativi conservati)
      |
      v
    [P4] Analisi semantica               (cosa fa: intento, contratti, invarianti, casi bordo, tipi, effetti)
      |
      v
    [P5] Tolleranza al rumore            (se l'input e' testo umano scritto male: normalizzazione e comprensione)
      |
      v
    [P6] Composizione                   (Modello di Comprensione JSON)
      |
      v
    [P7] Verifica                        (controlli automatici + test di comprensione)
      |
      v
    [P8] Registro                        (evento JSONL: cos'e' entrato, cosa e' stato capito, con che confidenza)
      |
      v
    OUTPUT: Modello di Comprensione (JSON)

### 1.2 Chi fa cosa

| Passo | Componente | Input | Output | Fallimento gestito come |
|---|---|---|---|---|
| P0 | Classificatore d'ingresso | testo o file | tipo di input (uno dei 6 della sezione 2) | tipo "sconosciuto": si prova la catena di fallback di P1 |
| P1a | Loader tree-sitter | estensione, shebang, contenuto | parser istanziato | grammatica assente: si passa a P1b |
| P1b | Inferenza grammaticale (sezione 4) | esempi positivi (e negativi) | BNF + parser | non converge: grammatica parziale con confidenza bassa |
| P1c | Grammatica fornita | file BNF/EBNF/grammar.js | parser | grammatica rotta: si annota e si scende a P1b |
| P1d | Modalita' black box | coppie input/output | modello comportamentale, senza UAST di sintassi | sempre possibile, confidenza limitata |
| P2 | Parser | sorgente + parser | albero concreto (CST) | nodi ERROR del parser: si conservano, non si buttano |
| P3 | Mapper UAST | CST + tabella di mapping | UAST (sezione 5) | nodo non mappato: etichetta UNKNOWN, contatore di copertura |
| P4 | Analista semantico (WhyLocalLM + regole) | UAST + testo | intento, contratti, invarianti, effetti | sezioni vuote con confidenza bassa, mai inventate |
| P5 | Normalizzatore rumore | frasi umane | frasi normalizzate + intento | sotto soglia: "non ho capito", mai indovinare in silenzio |
| P6 | Compositore | tutto sopra | Modello di Comprensione JSON | campi mancanti espliciti (null + motivo) |
| P7 | Verificatore | Modello + sorgente | esito verifiche | verifica fallita: il modello non si dichiara "capito" |
| P8 | Registro | evento completo | riga JSONL in locale | registro mancante: errore bloccante (la misura non si salta) |

### 1.3 Regola d'oro

La comprensione non dice mai "fatto" senza prova.
Ogni Modello di Comprensione porta la sua confidenza (0 a 1) e la sua provenienza.
Se la confidenza e' sotto 0.5, il sistema lo dichiara: "capito poco, servono piu' esempi".

---

## 2. Input possibili e gestione di ognuno

Il classificatore d'ingresso (P0) decide il tipo guardando: estensione, shebang,
presenza di keyword note, struttura del testo, presenza di coppie input/output,
presenza di una grammatica allegata.
Se il tipo e' ambiguo, si prova la catena nell'ordine della tabella sotto e si registra il tentativo.
Se il tipo e' "linguaggio noto" e la comprensione richiesta e' di una frase semplice
(non codice), il testo passa a P5 e non a P2.

### 2.1 Sorgente di un linguaggio noto

Cosa e': codice in un linguaggio che tree-sitter (o la KB, SPEC-06) conosce gia'.

Come si riconosce: estensione (.py, .js, .c), shebang (#!/usr/bin/env python3),
oppure corrispondenza nella scheda di studio (sezione 9) per nome o alias.

Percorso: P1a (grammatica tree-sitter esistente) -> P2 -> P3 -> P4 -> P6 -> P7 -> P8.

Nota: "noto" non significa "sempre corretto".
La grammatica tree-sitter accetta anche codice con errori e produce nodi ERROR.
Quei nodi si conservano: un pezzo di codice rotto si capisce per il resto, e l'errore si annota.

### 2.2 DSL mai visto (solo esempi positivi)

Cosa e': righe di un linguaggio sconosciuto, senza documentazione, senza grammatica.

Come si riconosce: nessuna estensione nota, nessuna keyword di linguaggi noti,
testo strutturato ripetitivo (keyword costanti in testa alla riga), piu' esempi che si somigliano.

Percorso: P1b (inferenza grammaticale, sezione 4) -> P2 (il parser appena costruito) -> P3 -> P4.

Esempio: il mini-DSL TASKFLOW della sezione 4.4 (5 righe, nessuno lo conosce).

### 2.3 Solo esempi input/output

Cosa e': nessun sorgente da nessuna parte. Solo coppie "dato questo, esce quello".

Come si riconosce: struttura a coppie, nessuna keyword di codice, nessuna sintassi ripetuta.

Percorso: P1d (modalita' black box). Il modello studia le coppie e propone:
- il comportamento (regola di trasformazione), con esempi di prova generati;
- ipotesi di tipi (numeri, stringhe, liste) sui dati;
- un insieme di casi bordo (input vuoto, input con un solo elemento, valori estremi).
Non si produce UAST di sintassi (non c'e' sintassi). Il Modello di Comprensione
ha uast con campo "sintassi_ignota": true e confidenza massima limitata a 0.7.
Tecniche disponibili: PBE con LLM (Cornell 2024), synthesis guidata dall'esecuzione (ICLR 2025), FlashFill.

### 2.4 Documentazione

Cosa e': prosa tecnica che descrive un linguaggio (reference manual, README, tutorial).

Percorso:
1. Il modello estrae dal testo: nome del linguaggio, esempi di codice citati, regole descritte a parole.
2. Gli esempi di codice trovati nel testo diventano esempi positivi per P1b.
3. Le regole descritte a parole entrano nel prompt di inferenza come contesto (aiutano ma non contano come verifica: solo il parser conta).
4. La documentazione viene conservata nella scheda di studio (sezione 9) come provenienza.

Attenzione: la documentazione mente o e' vecchia. La verita' la dice solo il parser sugli esempi.

### 2.5 Grammatica fornita

Cosa e': un file di grammatica esplicito (BNF, EBNF, grammar.js di tree-sitter, ANTLR .g4).

Percorso:
1. Si riconosce il formato (sezione 4.2).
2. Si converte nel formato interno (sezione 4.3).
3. Si prova la grammatica su tutti gli esempi disponibili (se ci sono).
4. Errori del parser: si annotano con la posizione esatta e la regola colpevole.
5. Passa: si usa subito, senza passare dall'inferenza.

Una grammatica fornita vale piu' di una inferita: confidenza base 0.95 invece di 0.6 (se compila e parsa gli esempi).

### 2.6 Frasi umane (anche scritte male)

Cosa e': "leggi il file, toglie le righe vuote, salvalo in output.txt".
Oppure scritta male: "lege il fle e togli le rige vote, salvalo in output.txt".
Oppure in due lingue: "read the file e scrivi le righe vuote fuori".

Percorso: P5 (sezione 7, robustezza al rumore) -> intento normalizzato -> P6.
Se la frase descrive un'azione su codice, l'intento generato entra nel Modello di Comprensione
nella sezione "intento" con provenienza "frase_umana".
Se la frase descrive un codice che esiste, il Modello collega intento e codice (campo collega_a).

Regola dura: se la frase non si capisce, si risponde "non ho capito" con confidenza < 0.5.
Vietato inventare un intento plausibile e farlo passare per capito.

---

## 3. Integrazione tree-sitter

### 3.1 Perche' tree-sitter

Tree-sitter e' un parser incrementale e tollerante agli errori.
Ha grammatiche per centinaia di linguaggi. Produce un albero concreto (CST, concrete syntax tree)
con posizioni esatte (riga, colonna, byte) e nodi di errore al posto di crash.
Incrementale significa: se un file cambia di poco, l'albero si aggiorna di poco (utile per watch e editor).
Per WhyCode e' il punto di partenza obbligato: prima si guarda cosa esiste (regola di lavoro), poi si inventa.

### 3.2 Come si carica una grammatica esistente

Passi concreti:

1. Riconoscere la lingua: estensione file, shebang, oppure ricerca nella KB per nome e alias.
2. Cercare la grammatica in ordine:
   a. cache locale di WhyCode (E:\Dev\WhyCode\grammatiche\);
   b. repository noto di grammatiche tree-sitter (scaricato una volta e tenuto in locale);
   c. grammatica scritta in grammar.js nella cartella del progetto analizzato.
3. Compilare la grammatica: grammar.js -> `tree-sitter generate` -> parser.c (oppure parser.wasm).
4. Caricare il parser con il binding locale (node-tree-sitter, py-tree-sitter o simili, secondo il linguaggio scelto per WhyCode).
5. Parsare il sorgente: `parser.parse(sorgente)` -> CST.
6. Salvare nella cache: hash della grammatica, versione tree-sitter, data. La prossima volta si carica subito.

### 3.3 Struttura dell'albero concreto

Un nodo tree-sitter ha:

| Campo | Significato | Esempio |
|---|---|---|
| type | tipo del nodo, nome della regola | `function_definition`, `identifier`, `ERROR` |
| named / unnamed | named sono i nodi con nome, unnamed sono token di punteggiatura | `if_statement` (named), `(` `)` (unnamed) |
| field | ruolo del figlio dentro il padre | `name:`, `parameters:`, `body:` |
| start_point / end_point | riga e colonna di inizio e fine | (4, 4) -> (9, 0) |
| start_byte / end_byte | posizione in byte nel file | 103 -> 210 |
| children | figli | lista di nodi |
| text | testo coperto (si legge dal sorgente con i byte) | il pezzo di codice esatto |
| is_error / is_missing | nodo di errore o token mancante | true quando il codice e' rotto |

Nodi speciali:
- `ERROR`: il parser non ha capito un pezzo. Si conserva, si annota con la posizione.
- `MISSING`: manca un token atteso. Il parser lo segnala senza crash.
Questi due nodi sono preziose informazioni: dicono esattamente dove il codice o la comprensione ha un buco.

Le query tree-sitter (S-expression) estraggono i costrutti chiave per il mapping UAST.
Esempio di query per trovare tutte le funzioni e i loro nomi:

    (function_definition
      name: (identifier) @nome_funzione)

    (call
      function: (identifier) @nome_chiamata)

Il motore delle query di tree-sitter e' usato dal mappatore UAST (sezione 5):
una query per ogni etichetta universale, piu' una tabella per gli attributi.
Query e tabelle di conversione sono salvate nella scheda di studio della lingua (sezione 9):
la prima volta costano, dopo sono gratuite.

### 3.4 Fallback quando la grammatica manca

Catena di fallback, nell'ordine. Si scende di un gradino solo se il precedente fallisce.

| Gradino | Quando | Cosa si fa | Confidenza massima del risultato |
|---|---|---|---|
| 1 | grammar.js presente nel progetto | si compila e si usa | 0.95 |
| 2 | grammatica fornita dall'utente | conversione e prova | 0.95 |
| 3 | esempi positivi disponibili (almeno 3) | inferenza grammaticale (sezione 4) | 0.6 |
| 4 | solo pochi esempi (1 o 2) | inferenza con avviso "pochi dati" | 0.4 |
| 5 | nessun esempio ma documentazione | estrazione esempi dal testo, poi gradino 3 | 0.5 |
| 6 | niente di niente (solo testo) | modalita' black box (2.3) o solo frase umana (2.6) | 0.3 |

Ogni discesa di gradino si registra nel registro (P8): si sa sempre da dove viene la comprensione.

---

## 4. Inferenza grammaticale automatica (il cuore dello "studiare al momento")

Questa sezione risolve il caso centrale: un linguaggio mai visto, descritto solo da esempi.
Metodo: ispirato a Kajal (arXiv 2412.08842), con aggiunte da HyGenar (arXiv 2505.16978) per gli esempi negativi.

Idea in una riga: **il modello propone una grammatica, un parser vero la prova, gli errori tornano al modello, si corregge fino a che il parser accetta tutti gli esempi.**

### 4.1 Perche' funziona

- Il modello non viene creduto sulla parola: ogni sua proposta e' provata da un parser.
- L'errore del parser e' oggettivo (riga, colonna, token atteso). E' un feedback che non si puo' contestare.
- Il ciclo si ripete finche' il parser e' d'accordo, non finche' al modello "sembra giusto".
- Kajal: da 45% (senza esempi nel prompt) a 60% (con few-shot) di grammatiche corrette. Il feedback iterativo alza ancora. La strada e' quella.
- Limite noto e onesto: il metodo da solo non basta per linguaggi enormi. Per questo i gradini 1 e 2 della sezione 3.4 (grammatiche esistenti) vengono prima.

### 4.2 Algoritmo passo passo

Ingressi:
- E+ = esempi positivi (almeno 3, meglio 5 o piu'). Obbligatori.
- E- = esempi negativi (facoltativi). Se ci sono, la grammatica finale deve rifiutarli tutti.
- D = documentazione o note (facoltativa). Solo contesto nel prompt, non verifica.
- N_max = limite iterazioni. Valore iniziale: 10 (come Kajal). WhyCode usa 12.
- M = il modello locale (WhyLocalLM). Se il modello piccolo non converge, si sale a un modello piu' grande (frontier come maestro) solo se disponibile, altrimenti non-convergenza dichiarata.

Pseudocodice:

    inferisci_grammatica(E+, E-, D):
        # Blocco 1: preparazione
        esempi_prova = E+                      # tutti gli esempi positivi
        few_shot = coppie codice_grammatica_esempio(configurate)   # 3 esempi fissi
        feedback = vuoto
        grammatica_corrente = NULL

        # Blocco 2: ciclo
        per i da 1 a N_max:
            prompt = costruisci_prompt(esempi_prova, few_shot, D, feedback)   # 4.3
            risposta = M.genera(prompt)
            grammatica_nuova = estrai_tra_tag(risposta, "<grammar>", "</grammar>")
            se grammatica_nuova e' vuota o non compila:
                feedback = "La grammatica non e' valida: " + errore_di_compilazione
                continua
            parser = compila(grammatica_nuova)
            esiti = []
            per ogni esempio in esempi_prova:
                esiti.append(parser.parse(esempio))
            falliti = [esiti con errore]
            se falliti e' vuoto:
                # Blocco 3: verifica negativa (solo se E- esiste)
                se E- esiste:
                    accettati_per_sbaglio = [e in E- dove parser.parse(e) riesce]
                    se accettati_per_sbaglio non e' vuoto:
                        feedback = "La grammatica accetta esempi che non deve: " + elenco
                        grammatica_corrente = grammatica_nuova    # tenuta come migliore parziale
                        continua
                # Blocco 4: successo
                salva_scheda_linguaggio(grammatica_nuova, confidenza=0.6, fonte="inferita")
                ritorna SUCCESSO(grammatica_nuova)
            # Blocco 5: feedback dall'errore (il cuore del ciclo)
            errore = primo_errore_di(falliti)      # riga, colonna, token atteso, token trovato
            feedback = "Errore del parser su esempio. Dettaglio: " + errore +
                       " Grammatica attuale: " + grammatica_nuova
            grammatica_corrente = grammatica_nuova    # tenuta come migliore parziale

        # Blocco 6: non convergenza
        registra_evento("non_convergenza", iterazioni=N_max, ultima_grammatica=grammatica_corrente)
        ritorna PARZIALE(grammatica_corrente, confidenza=0.3, motivo="non converge dopo N_max iterazioni")

Punti chiave del ciclo:
1. **Un errore alla volta.** Il parser riporta il primo errore (riga, colonna, cosa attendeva, cosa ha trovato). Al modello si manda quello. Un errore per giro, cosi' la correzione e' chirurgica.
2. **La grammatica migliore si tiene sempre.** Anche se un giro fallisce, non si perde il lavoro: si tiene l'ultima che compila e parsa di piu'. Alla fine, se non converge, si consegna quella con confidenza bassa e si dice cosa manca.
3. **Il modello non vede mai il verdetto "a occhio".** Vede solo l'errore del parser. La verifica e' meccanica.
4. **Few-shot fisso.** Nel prompt ci sono 3 coppie (snippet, grammatica) di esempio, tenute in un file di configurazione. Sono il manuale d'istruzioni per il formato della risposta.
5. **Determinismo.** Temperatura bassa e seme fisso: stesso input, proposta simile. Ogni proposta e ogni errore si registrano: si puo' ripercorrere il ciclo e capire dove si e' perso.

### 4.3 Formato del prompt (contratto esatto)

    SEI UNO STRUMENTO DI INFERENZA GRAMMATICALE.
    Devi dedurre la grammatica BNF del linguaggio dagli esempi.
    La grammatica sara' provata da un parser Lark: se non compila o non accetta
    tutti gli esempi, tornera' indietro con l'errore esatto.

    FORMATO RISPOSTA OBBLIGATORIO:
    <grammar>
    regola: alternativa
    regola: alternativa
    </grammar>
    (niente altro testo fuori dai tag)

    ESEMPI DI RIFERIMENTO (codice -> grammatica):
    [3 coppie few-shot dal file di configurazione]

    ESEMPI DEL NUOVO LINGUAGGIO (devono essere accettati tutti):
    [E+]

    ESEMPI DA RIFIUTARE (se presenti):
    [E-]

    CONTESTO (se presente):
    [D]

    FEEDBACK DELL'ULTIMO TENTATIVO (dal secondo giro in poi):
    [errore del parser + grammatica precedente]

    Ora produci la grammatica per il nuovo linguaggio, solo dentro i tag <grammar>.

### 4.4 Esempio completo: il mini-DSL TASKFLOW

Nessuno conosce TASKFLOW. Nessuna documentazione. Solo 5 righe di esempio:

    TASK pulisci
    READ "vendite.csv"
    FILTER importo > 100
    MAP totale = importo * 1.22
    WRITE "vendite_pulite.csv"

Cosa si vede a occhio: 5 righe, una keyword in testa a ogni riga (TASK, READ, FILTER, MAP, WRITE),
stringhe tra virgolette, un nome dopo TASK, confronti con >, assegnazioni con =, moltiplicazioni con *.

Esempi negativi forniti (la grammatica deve rifiutarli):

    READ vendite.csv          (stringa senza virgolette)
    TASK pulisci senza fine   (rumore dopo il nome)

**Iterazione 1.** Il modello propone:

    start: riga+
    riga: task | read | filter | map | write
    task: "TASK" NOME
    read: "READ" STRINGA
    filter: "FILTER" NOME OPP NUMERO
    write: "WRITE" STRINGA
    OPP: ">" | "<"
    NOME: /[a-z_]+/
    NUMERO: /[0-9]+(\.[0-9]+)?/
    STRINGA: "\"" /[^"]*/ "\""
    %ignore " "

Il parser compila e prova.
Esiti: righe 1, 2, 3 e 5 passano. La riga 4 (`MAP totale = importo * 1.22`) NO.
Errore del parser: `Unexpected token at line 4, col 12. Expected end of line. The token "=" was not expected.`
(la regola `map` non esiste: il modello l'ha solo elencata in `riga` ma non l'ha definita).
In realta' qui il parser direbbe: la regola `map` non e' definita affatto -> errore di compilazione:
`GrammarError: rule 'map' not defined`. Errore di compilazione, non di parsing.

Feedback al modello:

    LA GRAMMATICA NON COMPILA: la regola "map" e' usata ma non definita.
    Grammatica attuale: [la BNF sopra]
    Correggi e riprova.

**Iterazione 2.** Il modello aggiunge la regola mancante, ma la sbaglia:

    map: "MAP" NOME "=" NOME "*" NUMERO

Esiti: righe 1, 2, 3, 5 passano. Riga 4 passa pure.
Ma la verifica negativa: l'esempio negativo `READ vendite.csv` (senza virgolette)...
la regola `read` richiede STRINGA con virgolette, quindi viene rifiutato. Bene.
Secondo negativo `TASK pulisci senza fine` viene rifiutato (riga non completa). Bene.
Pero' c'e' un problema piu' fine: `FILTER importo > 100`, con l'OPP definito come `">" | "<"`,
vale. E `MAP totale = importo * 1.22` vale. Sembra tutto verde.
Il parser pero' segnala un warning che il ciclo di prova tratta come errore:
la grammatica accetta anche `MAP totale = importo * 5` (numero intero),
ma l'unico esempio di MAP ha un decimale. Non e' un errore: e' una scelta.
Si annota nella scheda: "MAP accetta anche interi, non confermato dagli esempi".

In alternativa, se il secondo giro avesse questo errore (caso peggiore, mostrato per completezza):

    map: "MAP" NOME "=" NOME "*" NUMERO

con NUMERO definito solo come intero `/[0-9]+/` (il modello dimentica i decimali).
Esito: riga 4 fallisce: `Unexpected token "1.22" at line 4, col 24. Expected NUMERO.`
Feedback al modello con questo errore.

**Iterazione 3.** Il modello corregge NUMERO e la grammatica finale e':

    <grammar>
    start: riga+
    riga: task | read | filter | map | write
    task: "TASK" NOME
    read: "READ" STRINGA
    filter: "FILTER" NOME OPP NUMERO
    map: "MAP" NOME "=" NOME "*" NUMERO
    write: "WRITE" STRINGA
    OPP: ">" | "<"
    NOME: /[a-z_]+/
    NUMERO: /[0-9]+(\.[0-9]+)?/
    STRINGA: "\"" /[^"]*/ "\""
    %ignore " "
    </grammar>

Esiti: tutte e 5 le righe positive passano. Tutti i negativi vengono rifiutati.
SUCCESSO dopo 3 iterazioni (2 correzioni).

Cosa si e' imparato del linguaggio (gia' qui, prima della semantica):

| Osservazione | Deduzione | Confidenza |
|---|---|---|
| 5 keyword maiuscole | il linguaggio e' a comandi, una keyword per riga | 0.9 |
| nome dopo TASK | definisce il nome del flusso | 0.8 |
| stringhe sempre tra virgolette | le virgolette sono obbligatorie | 0.9 |
| confronto `>` in FILTER | FILTER e' un filtro di condizione | 0.7 |
| `=` dentro MAP | MAP costruisce un valore nuovo | 0.7 |
| ordine READ FILTER MAP WRITE | la pipeline e' sequenziale, dati che scorrono | 0.6 |

Queste deduzioni vanno nel Modello di Comprensione come intento di massima, marcate come inferite.

### 4.5 Criteri di stop e non convergenza

Si ferma quando, in quest'ordine:
1. La grammatica compila, parsa tutti i positivi e, se esistono, rifiuta tutti i negativi. STOP: successo.
2. Si raggiunge N_max = 12 iterazioni. STOP: parziale.
3. Tre iterazioni di fila con lo stesso errore identico. STOP anticipato: il modello e' in loop, insistere non serve. Si registra "ciclo bloccato".

Se non converge, cosa si fa (in ordine, tutto registrato):
1. Si salva la migliore grammatica parziale con confidenza 0.3 e la lista degli esempi che falliscono.
2. Si producono due uscite:
   a. il Modello di Comprensione parziale (chi dice: "capito questo, non capito quello");
   b. una richiesta di aiuto: "servono altri esempi di X" oppure "serve la documentazione".
3. Se e' la prima volta per quel linguaggio, si registra nel registro come tentativo fallito.
4. Se un modello piu' grande e' disponibile (frontier come maestro), si propone l'escalation, mai automatica senza misura.

### 4.6 Errori tipici del modello e contromisure

| Errore tipico | Esempio | Contromisura |
|---|---|---|
| Regola usata ma non definita | `map` in `riga` senza regola `map` | errore di compilazione -> feedback diretto |
| Token con nome sbagliato | CNAME al posto di NAME (caso reale di Kajal) | feedback: "rule mismatch" -> il modello rinomina |
| Caratteri non gestiti | manca il decimale in NUMERO | errore di parsing con posizione -> correzione |
| Grammatica troppo permissiva | accetta qualsiasi riga con start: /.*/ | verifica negativa: se E- ci sono, viene bocciata |
| Grammatica troppo stretta | rifiuta un positivo fuori dagli esempi | riprovata su tutto E+ a ogni giro |
| Loop su stesso errore | 3 giri con lo stesso messaggio | stop anticipato a 3 giri identici |

---

## 5. UAST: l'albero universale di WhyCode

### 5.1 Cos'e'

L'UAST (Universal Abstract Syntax Tree) e' l'albero di WhyCode.
Ha le stesse informazioni essenziali per ogni linguaggio, espresse con etichette universali.
Ispirato a Babelfish/UAST (source{d}, ruoli come Function, Assignment, Call, Import)
e a YASA-UAST (Ant Group), ma con lo schema di WhyCode: 30 etichette, attributi comuni,
provenienza sempre conservata.

Regola dura: **niente si perde**.
L'etichetta e' universale, ma l'attributo `native_kind` conserva il nome esatto del nodo
nel linguaggio di partenza (`function_definition` di Python, `FunctionDeclaration` di
JavaScript, `function_definition` di C). Cosi' l'UAST e' universale ma la scheda del
linguaggio resta completa.

### 5.2 Le etichette universali (30)

| # | Etichetta | Definizione | Come appare nei linguaggi tipici |
|---|---|---|---|
| 1 | FILE | l'unita' sorgente intera | modulo .py, file .js, file .c |
| 2 | IMPORT | richiama codice esterno nel file | import, require, #include, use |
| 3 | DECLARATION | dichiara un nome nuovo senza dargli un valore subito | var x, int x, let x |
| 4 | FUNCTION | definisce una funzione o metodo | def, function, tipo di ritorno con nome |
| 5 | PARAMETER | un parametro formale di una funzione | argomenti tra parentesi nella definizione |
| 6 | RETURN | restituisce un valore da una funzione | return |
| 7 | CALL | invoca una funzione o metodo | f(x), obj.m(x), printf(...) |
| 8 | ARGUMENT | un valore passato a una chiamata | elemento nella lista argomenti |
| 9 | VARIABLE | riferimento a un nome gia' dichiarato | uso di x in un'espressione |
| 10 | LITERAL | un valore scritto direttamente | 42, "ciao", true, 3.14 |
| 11 | ASSIGNMENT | assegna o cambia il valore di un nome | x = 5, x += 1 |
| 12 | EXPRESSION | espressione generica, combinazione di pezzi | a + b, f(x) - 1 |
| 13 | OPERATOR | operatore aritmetico, logico o di confronto | +, -, *, >, and, && |
| 14 | CONDITION | la condizione di un ramo o di un ciclo | l'espressione dentro if o while |
| 15 | BRANCH | diramazione condizionale: if, else, elif | if, else, else if, switch case |
| 16 | LOOP | ripetizione: for, while, foreach | for, while, do-while |
| 17 | BREAK | esce dal ciclo | break |
| 18 | CONTINUE | salta al giro successivo del ciclo | continue |
| 19 | BLOCK | gruppo di istruzioni raggruppate | corpo indentato, { }, do ... end |
| 20 | COMMENT | commento nel sorgente | #, //, /* */, -- |
| 21 | TYPE | tipo scritto o annotato (nome di tipo, cast di tipo) | int, float, String, str |
| 22 | CLASS | aggregato di dati e comportamento | class, struct, record, interface |
| 23 | MEMBER | campo o metodo dentro una classe | attributo, proprieta', metodo |
| 24 | EXCEPTION | gestione di errori: prova e cattura | try/catch, try/except |
| 25 | THROW | lancia un errore | raise, throw, panic |
| 26 | IO_EFFECT | effetto verso l'esterno: file, rete, console | open, print, read, write, fetch |
| 27 | MUTATION | modifica di stato (incluso stato di un oggetto) | x.attr = v, lista.append, set |
| 28 | CAST | conversione esplicita di tipo | (int)x, int(x), parseInt |
| 29 | EXIT | terminazione del programma o di una funzione | exit, return con codice, sys.exit |
| 30 | MACRO | testo che si espande prima della compilazione | #define, macro, template |

Nota: i primi 12 coprono il 90% di un programma tipico. La Fase 1 del PROGETTO chiede
un UAST minimo di 10-15 etichette: il sottoinsieme obbligatorio della Fase 1 e' proprio
FILE, IMPORT, FUNCTION, PARAMETER, RETURN, CALL, ARGUMENT, VARIABLE, LITERAL, ASSIGNMENT,
CONDITION, BRANCH, LOOP, BLOCK, IO_EFFECT (15 etichette). Le altre si aggiungono in Fase 1 avanzata.

### 5.3 Attributi comuni (ogni nodo UAST li ha)

| Attributo | Tipo | Obbligatorio | Significato |
|---|---|---|---|
| label | stringa (una delle 30) | si | etichetta universale |
| id | stringa | si | identificatore unico nel documento (es. uast-0007) |
| native_kind | stringa | si | nome esatto del nodo nel linguaggio di partenza |
| language | stringa | si | linguaggio di origine (python, javascript, c, taskflow, ...) |
| span | oggetto {start: [riga, colonna], end: [riga, colonna], byte_start, byte_end} | si | dove sta nel sorgente |
| text | stringa | si | il testo esatto (dal sorgente) |
| name | stringa o null | no | il nome, se esiste (funzione, variabile, classe) |
| value | valore o null | no | il valore, se e' un letterale |
| type_hint | stringa o null | no | tipo inferito o dichiarato |
| children | lista di nodi | si | figli (anche vuota) |
| confidence | numero 0 a 1 | si | quanto siamo sicuri di questa etichetta |
| source | stringa | si | "tree-sitter", "inferita", "euristica", "black-box" |

Regole di mapping (Chi -> cosa):
- ogni nodo tree-sitter con tipo noto ha una riga nella tabella di conversione della scheda lingua;
- un nodo che contiene un IO_EFFECT si propaga: la funzione che chiama `open` e `write` ha effetto io anche se la parola "io" non appare. Gli effetti salgono lungo l'albero (propagazione verso l'alto);
- il BLOCK di una FUNCTION non e' un BLOCK a se': e' il corpo della funzione (field body). Il mapper lo sa e non conta doppioni;
- i COMMENT si agganciano al nodo piu' vicino che seguono (commento di quella funzione).

### 5.4 Esempio 1: lo stesso programma in Python

Programma di prova (conta le righe non vuote di un file e lo stampa):

    import sys

    def conta_righe(percorso):
        n = 0
        with open(percorso) as f:
            for riga in f:
                if riga.strip():
                    n = n + 1
        return n

    print(conta_righe("app.log"))

Mapping (tabella dei nodi principali):

| Codice | track-sitter (Python) | UAST label |
|---|---|---|
| import sys | import_statement | IMPORT |
| def conta_righe(...) | function_definition (field name) | FUNCTION, name="conta_righe" |
| percorso | identifier (field parameters) | PARAMETER |
| n = 0 | assignment | ASSIGNMENT |
| with open(...) as f | with_statement + call open | IO_EFFECT + CALL |
| for riga in f | for_statement | LOOP (kind=foreach) |
| if riga.strip() | if_statement | BRANCH, con figlio CONDITION |
| riga.strip() | call (attribute strip) | CALL, name="strip" |
| n = n + 1 | assignment + binary_operator | ASSIGNMENT (che contiene EXPRESSION) |
| return n | return_statement | RETURN |
| print(...) | call | CALL, name="print", IO_EFFECT (console) |
| # commento | comment | COMMENT |

Albero UAST ridotto (JSON, i nodi principali):

    {
      "label": "FILE",
      "language": "python",
      "native_kind": "module",
      "children": [
        { "label": "IMPORT", "name": "sys", "native_kind": "import_statement", "confidence": 1.0 },
        {
          "label": "FUNCTION",
          "name": "conta_righe",
          "native_kind": "function_definition",
          "confidence": 1.0,
          "children": [
            { "label": "PARAMETER", "name": "percorso", "native_kind": "identifier", "confidence": 1.0 },
            {
              "label": "ASSIGNMENT",
              "native_kind": "assignment",
              "children": [
                { "label": "VARIABLE", "name": "n" },
                { "label": "LITERAL", "value": 0 }
              ]
            },
            {
              "label": "LOOP",
              "kind": "foreach",
              "native_kind": "for_statement",
              "children": [
                { "label": "VARIABLE", "name": "riga" },
                {
                  "label": "BRANCH",
                  "native_kind": "if_statement",
                  "children": [
                    { "label": "CONDITION", "children": [
                        { "label": "CALL", "name": "strip" }
                    ]},
                    { "label": "ASSIGNMENT", "children": [
                        { "label": "VARIABLE", "name": "n" },
                        { "label": "EXPRESSION", "children": [
                            { "label": "VARIABLE", "name": "n" },
                            { "label": "OPERATOR", "value": "+" },
                            { "label": "LITERAL", "value": 1 }
                        ]}
                    ]}
                  ]
                }
              ]
            },
            { "label": "RETURN", "children": [ { "label": "VARIABLE", "name": "n" } ] }
          ]
        },
        {
          "label": "CALL",
          "name": "print",
          "io_effect": "console_write",
          "native_kind": "call",
          "children": [
            { "label": "ARGUMENT", "children": [
                { "label": "CALL", "name": "conta_righe" },
                { "label": "LITERAL", "value": "app.log" }
            ]}
          ]
        }
      ]
    }

### 5.5 Esempio 2: lo stesso programma in JavaScript

    import fs from "fs";

    function contaRighe(percorso) {
      let n = 0;
      const righe = fs.readFileSync(percorso, "utf8").split("\n");
      for (const riga of righe) {
        if (riga.trim()) {
          n = n + 1;
        }
      }
      return n;
    }

    console.log(contaRighe("app.log"));

Differenze di mapping rispetto a Python (le stesse etichette, forme native diverse):

| Codice | tree-sitter (JavaScript) | UAST label | Nota |
|---|---|---|---|
| import fs from "fs" | import_statement | IMPORT | forma ESM, non Python |
| function contaRighe | function_declaration | FUNCTION | field name |
| let n = 0 | lexical_declaration (let) | DECLARATION + ASSIGNMENT | dichiarazione con valore: due etichette |
| const righe = ... | lexical_declaration (const) | DECLARATION + ASSIGNMENT | |
| fs.readFileSync(...) | call_expression (member) | CALL + IO_EFFECT (file_read) | la propagazione lo conferma: dentro c'e' read |
| .split("\n") | call_expression | CALL | concatenata |
| for (const riga of righe) | for_in_statement | LOOP (kind=foreach) | |
| riga.trim() | call_expression | CALL | |
| console.log(...) | call_expression | CALL + IO_EFFECT (console_write) | effetto console |
| return n; | return_statement | RETURN | |

Nota universale: Python `open(...)` e JavaScript `readFileSync(...)` hanno lo stesso
risultato UAST (IO_EFFECT di lettura file), pur essendo librerie diverse.
E' esattamente il punto dell'UAST: il "cosa" resta, il "come" si conserva in native_kind.

### 5.6 Esempio 3: lo stesso programma in C

    #include <stdio.h>

    int conta_righe(const char* percorso) {
        FILE* f = fopen(percorso, "r");
        int n = 0;
        char riga[1024];
        while (fgets(riga, 1024, f)) {
            if (riga[0] != '\n' && riga[0] != '\0') {
                n = n + 1;
            }
        }
        fclose(f);
        return n;
    }

    int main(void) {
        printf("%d\n", conta_righe("app.log"));
        return 0;
    }

Mapping C:

| Codice | tree-sitter (C) | UAST label | Nota |
|---|---|---|---|
| #include <stdio.h> | preproc_include | IMPORT | forma C |
| int conta_righe(const char* percorso) | function_definition | FUNCTION + TYPE (int) + PARAMETER | C dichiara i tipi |
| const char* percorso | parameter_declaration | PARAMETER + TYPE | |
| FILE* f = fopen(...) | declaration + call | DECLARATION + ASSIGNMENT + CALL + IO_EFFECT (file_open) | |
| char riga[1024] | declaration (array) | DECLARATION | 1024 e' un valore critico: va nei casi bordo |
| while (fgets(...)) | while_statement | LOOP (kind=while) + CONDITION | |
| riga[0] != '\n' && riga[0] != '\0' | binary_expression | CONDITION con OPERATOR (&&, !=) + LITERAL | |
| fclose(f) | call_expression | CALL + IO_EFFECT | chiusura file, non e' in Python/JS: gestione risorse |
| return n; | return_statement | RETURN | |
| int main(void) | function_definition | FUNCTION, name="main" | entry point del programma |
| printf(...) | call_expression | CALL + IO_EFFECT (console_write) | |

Lettura universale: nei tre linguaggi lo stesso compito appare
(IMPORT, FUNCTION, PARAMETER, ASSIGNMENT, LOOP, BRANCH, CONDITION, RETURN, CALL)
con forme native diverse e con differenze vere che l'UAST NON nasconde:
C apre e chiude il file a mano, C dichiara i tipi, C ha un main, Python ha il with.
Queste differenze sono annotate nei casi bordo e nelle dipendenze, non cancellate.
L'UAST uniforma la lettura, non appiattisce il comportamento.

### 5.7 Mapping del mini-DSL TASKFLOW

Sulla grammatica inferita della sezione 4.4, con lo stesso mappatore.

    TASK pulisci
    READ "vendite.csv"
    FILTER importo > 100
    MAP totale = importo * 1.22
    WRITE "vendite_pulite.csv"

| Codice | Regola inferita | UAST label | Nota |
|---|---|---|---|
| TASK pulisci | task | FUNCTION (kind=unit) + nome dato | un TASK e' un'unita' di lavoro nominata |
| READ "vendite.csv" | read | IO_EFFECT (file_read) + LITERAL | |
| FILTER importo > 100 | filter | BRANCH (kind=filter) + CONDITION (OPERATOR >, LITERAL 100) | |
| MAP totale = importo * 1.22 | map | ASSIGNMENT + EXPRESSION (OPERATOR *, LITERAL 1.22) | totale e' una VARIABLE |
| WRITE "vendite_pulite.csv" | write | IO_EFFECT (file_write) + LITERAL | |

Osservazione per il Modello di Comprensione: le tre righe centrali (READ, FILTER, MAP)
formano una pipeline: legge dati, li filtra, li trasforma, li scrive.
L'intento a livello alto: "pulire vendite.csv tenendo solo importo > 100, aggiungendo il 22% di IVA, scrivendo in vendite_pulite.csv".
Questa e' una deduzione, marcata come inferita, con confidenza 0.6.

---

## 6. Modello di Comprensione: formato JSON

Il Modello di Comprensione e' l'output del Livello 1. E' un JSON singolo per "un pezzo di codice o un intento".
Nel testo sotto, i campi con schema e regole. Dopo, l'esempio completo compilato.

### 6.1 Schema campo per campo

    {
      "schema": "whycode.comprehension/1",
      "id": "comp-2026-10-17-0001",
      "created": "2026-10-17T14:30:00+02:00",

      "provenienza": {
        "tipo_input": "sorgente_linguaggio_noto | dsl_mai_visto | esempi_io | documentazione | grammatica_fornita | frase_umana",
        "fonte": "percorso file, o 'incolla', o 'frase'",
        "hash_sha256": "hash del testo di ingresso",
        "lingua_umana": "it | en | es | null",
        "testo_originale": "solo per frasi umane, il testo esatto scritto dall'utente"
      },

      "linguaggio": {
        "nome": "python | taskflow | ...",
        "riconosciuto": true,
        "come": "estensione | shebang | kb | inferito | fornito",
        "grammatica": { "tipo": "tree-sitter | inferita | fornita", "confidenza": 0.0, "riferimento": "scheda kb id" }
      },

      "intento": {
        "sintesi": "una frase che dice cosa fa il codice",
        "azioni": ["i verbi concreti, in ordine: leggi, filtra, scrivi"],
        "provenienza_intento": "dal_codice | dalla_frase | dai_test | mista",
        "confidenza": 0.0
      },

      "contratti": [
        {
          "nome": "conta_righe",
          "pre": ["condizioni che devono valere prima della chiamata"],
          "post": ["condizioni garantite dopo la chiamata"],
          "confidenza": 0.0
        }
      ],

      "invarianti": [
        { "testo": "condizione sempre vera dentro il codice", "confidenza": 0.0 }
      ],

      "casi_bordo": [
        { "testo": "input vuoto: cosa succede", "atteso": "comportamento previsto", "confidenza": 0.0 }
      ],

      "tipi": {
        "parametri": { "percorso": "string" },
        "ritorno": "int",
        "variabili": { "n": "int" },
        "confidenza": 0.0
      },

      "effetti": {
        "io": ["file_read: vendite.csv", "file_write: vendite_pulite.csv", "console_write: stdout"],
        "stato": ["mutazione: n", "mutazione: totale"],
        "errori": ["non gestisce file mancante", "non gestisce CSV malformato"]
      },

      "dipendenze": {
        "import": ["sys", "stdio.h"],
        "chiamate_esterne": ["open", "print"],
        "runtime": ["libreria standard"]
      },

      "esempi_uso": [
        { "input": "app.log con 10 righe, 3 vuote", "output_atteso": "stampa 7" }
      ],

      "confidenza": {
        "sintassi": 0.0,
        "sintassi_motivo": "come e' stata ottenuta la sintassi",
        "semantica": 0.0,
        "semantica_motivo": "cosa regge la lettura semantica",
        "tipi": 0.0,
        "generale": 0.0,
        "formula": "generale = media pesata: sintassi 0.35, semantica 0.45, tipi 0.20",
        "sotto_soglia": ["le sezioni con confidenza sotto 0.5, elencate"]
      },

      "uast": {
        "disponibile": true,
        "radice": "id del nodo FILE nell'albero UAST",
        "nodi_totali": 0,
        "nodi_mappati": 0,
        "copertura": 0.0
      },

      "note": ["dubbi aperti, cose viste ma non sicure"],
      "errori_annotati": ["nodi ERROR del parser, con posizione"]
    }

Regole del formato:
1. **Ogni campo e' obbligatorio nella presenza.** Se non c'e' il dato, si scrive null con un motivo in note. Mai omettere.
2. **Ogni pezzo ha la sua confidenza.** Non esiste una confidenza unica per tutto: sintassi e semantica si misurano separatamente.
3. **La provenienza non si perde mai.** Chi legge il modello sa sempre da dove viene ogni cosa.
4. **niente invenzioni.** Un campo vuoto con motivo e' meglio di un campo riempito a caso.
5. Il numero "generale" e' una media pesata: sintassi 0.35, semantica 0.45, tipi 0.20. I pesi stanno in configurazione e si possono calibrare con le misure (sezione 8).

### 6.2 Esempio completo compilato (Python, conta_righe)

    {
      "schema": "whycode.comprehension/1",
      "id": "comp-2026-10-17-0001",
      "created": "2026-10-17T14:30:00+02:00",
      "provenienza": {
        "tipo_input": "sorgente_linguaggio_noto",
        "fonte": "E:\\prove\\conta.py",
        "hash_sha256": "9f2c...ab",
        "lingua_umana": null,
        "testo_originale": null
      },
      "linguaggio": {
        "nome": "python",
        "riconosciuto": true,
        "come": "estensione",
        "grammatica": { "tipo": "tree-sitter", "confidenza": 0.98, "riferimento": "kb:python@2026-10-01" }
      },
      "intento": {
        "sintesi": "conta le righe non vuote di un file e stampa il numero",
        "azioni": ["apri file", "itera righe", "salta righe vuote", "conta le altre", "stampa il totale"],
        "provenienza_intento": "dal_codice",
        "confidenza": 0.9
      },
      "contratti": [
        {
          "nome": "conta_righe",
          "pre": ["percorso e' una stringa", "il file esiste ed e' leggibile"],
          "post": ["ritorna un intero >= 0", "non modifica il file"],
          "confidenza": 0.85
        }
      ],
      "invarianti": [
        { "testo": "n non e' mai negativo", "confidenza": 0.95 },
        { "testo": "n viene incrementato solo quando riga.strip() e' non vuoto", "confidenza": 0.9 }
      ],
      "casi_bordo": [
        { "testo": "file vuoto", "atteso": "ritorna 0", "confidenza": 0.9 },
        { "testo": "file con solo righe vuote", "atteso": "ritorna 0", "confidenza": 0.9 },
        { "testo": "file senza permessi di lettura", "atteso": "eccezione non gestita", "confidenza": 0.8 },
        { "testo": "riga con soli spazi", "atteso": "conta come vuota (strip)", "confidenza": 0.95 }
      ],
      "tipi": {
        "parametri": { "percorso": "string" },
        "ritorno": "int",
        "variabili": { "n": "int", "riga": "string", "f": "file handle" },
        "confidenza": 0.7
      },
      "effetti": {
        "io": ["file_read: percorso", "console_write: stdout"],
        "stato": ["mutazione locale: n (nessuno stato esterno cambiato)"],
        "errori": ["FileNotFoundError se il percorso non esiste", "PermissionError se non leggibile"]
      },
      "dipendenze": {
        "import": ["sys"],
        "chiamate_esterne": ["open", "print"],
        "runtime": ["CPython standard library"]
      },
      "esempi_uso": [
        { "input": "file con 10 righe di cui 3 vuote", "output_atteso": "stampa 7" },
        { "input": "file vuoto", "output_atteso": "stampa 0" }
      ],
      "confidenza": {
        "sintassi": 0.98,
        "sintassi_motivo": "grammatica tree-sitter ufficiale, zero nodi ERROR",
        "semantica": 0.85,
        "semantica_motivo": "codice corto e chiaro; intento evidente dal nome e dal flusso",
        "tipi": 0.7,
        "tipi_motivo": "Python non dichiara i tipi: parametri e ritorno stimati dal contesto",
        "generale": 0.86,
        "formula": "generale = 0.35*0.98 + 0.45*0.85 + 0.20*0.7 = 0.8655 -> 0.86",
        "sotto_soglia": []
      },
      "uast": {
        "disponibile": true,
        "radice": "uast-0001",
        "nodi_totali": 41,
        "nodi_mappati": 41,
        "copertura": 1.0
      },
      "note": ["sys importato ma mai usato: possibile residuo da rimuovere"],
      "errori_annotati": []
    }

---

## 7. Robustezza al rumore (test delle lingue umane)

La frase di Whyed: "far comprendere ogni parola ogni frase leggibile male da ogni lingua ma comprensibile".
Questa sezione e' il catalogo dei guasti del testo umano e le contromisure.
Vale solo per le frasi umane (P5): il codice ha i suoi errori, gestiti da P2.

### 7.1 Catalogo dei tipi di errore

| # | Tipo di errore | Esempio (frase giusta -> frase scritta male) | Causa tipica | Strategia |
|---|---|---|---|---|
| 1 | typo da tastiera QWERTY | "leggi" -> "legii", "file" -> "fike" (tasto vicino) | dito che scivola | distanza di edit con costo basso per lettere adiacenti sulla tastiera |
| 2 | accenti mancanti | "perche'" -> "perche", "e'" -> "e" | tastiera o fretta | normalizzazione: confronto senza accenti; ambiguita' "e" -> lo decide il contesto (il modello) |
| 3 | troncamenti | "importare" -> "impor", "funzione" -> "funz" | fretta, interruzioni | prefisso: se il prefisso e' univoco tra le parole note, si completa |
| 4 | parole in ordine sbagliato | "il file leggi e scrivi il risultato" | costruzione orale | il modello legge la frase intera: i ruoli (verbo, oggetto) si ricavano dal contesto, non dalla posizione |
| 5 | mix di lingue umane | "read the file e scrivi le righe fuori" | abitudine, memoria | rilevazione multi-lingua per parola; dizionario di intenti per italiano, inglese, spagnolo; il modello unifica |
| 6 | errori da dislessia | "codice" -> "docice" (inversione), "che" -> "ke", "questo" -> "queto" | come si legge la parola, non come si scrive | fonetica: chiavi per suono (k = c dura, ch = c, q = c, scempiamento doppie); distanza fonetica oltre che di edit |
| 7 | doppie sbagliate | "righe" -> "rige", "dobbiamo" -> "dobiamo" | pronuncia | regola di normalizzazione: le doppie si appiattiscono prima del confronto |
| 8 | spazi mancanti o doppi | "illeggifile" -> "illeggi file" | battitura | segmentazione: dizionario + modello che divide le parole attaccate |
| 9 | abbreviazioni personali | "leggere" -> "legg.", "per favore" -> "pf" | abitudine | tavola delle abbreviazioni personali, che cresce a ogni uso (KB, SPEC-06) |
| 10 | punteggiatura assente | "leggi il file togli le vuote scrivi" | fretta | il modello non ha bisogno della punteggiatura: i confini si ricavano dalle azioni |

### 7.2 La pipeline di P5, passo passo

1. **Rilevazione lingua.** Per ogni parola: nei dizionari IT/EN/ES. Conteggio. Lingua dominante = massimo. Mix ammesso: le parole straniere note si traducono, le altre restano.
2. **Normalizzazione.** Unicode NFC, minuscole, accenti appiattiti ("e'" -> "e"), doppie appiattite, punteggiatura rimossa tranne i numeri e i percorsi file.
3. **Correzione a candidati.** Per ogni parola fuori dizionario:
   a. distanza di edit (Levenshtein con pesi QWERTY: sostituire lettere vicine costa 0.5, lontane 1.0);
   b. distanza fonetica (chiave fonetica della parola, adattata a italiano: "ke" e "che" collassano, "c" e "k" collassano);
   c. prefisso (troncamento: se i prefissi univoci portano a una sola parola, si completa);
   d. il modello guarda la frase intera e propone la parola giusta. Nel dubbio tra due candidate, vince quella che rende l'intento coerente.
   Le candidate con punteggio simile si conservano TUTTE (ambiguita' dichiarata, non risolta d'ufficio).
4. **Comprensione dell'intento.** Il modello legge la frase corretta e produce: azione principale, oggetto, vincoli, output. Ogni pezzo con confidenza.
5. **Decisione.** Se la confidenza dell'intento e' >= 0.5: si produce il Modello di Comprensione con testo_originale e testo_normalizzato. Se sotto 0.5: risposta onesta "non ho capito" con la lista di cosa e' mancato.
6. **Apprendimento.** Ogni coppia (parola scritta male -> parola corretta confermata) si salva nel dizionario personale (SPEC-06). La prossima volta quella parola non costa nulla.

### 7.3 Protocollo di test multi-lingua

Set di prova: 30 frasi (10 italiano, 10 inglese, 10 spagnolo).
Ogni frase ha un intento atteso scritto prima del test (golden set congelato, si veda sezione 8).

Esempi del set (3 per lingua, mostrati qui; le altre 27 seguono lo stesso schema):

| Lingua | Frase scritta male | Intento atteso (le azioni chiave) |
|---|---|---|
| Italiano | "lege il fle e scrvi le rige vote in un altro fle" | leggi file; rimuovi righe vuote; scrivi in un nuovo file |
| Italiano | "fa un funzone ke contaa quante volte ce la parola ciao in un testo" | conta le occorrenze della parola ciao nel testo (funzione) |
| Italiano | "ordina la lista di nomi e po' stampa" | ordina una lista di nomi; stampa il risultato |
| Inglese | "reed teh file and remoove emty lines" | read file; remove empty lines |
| Inglese | "mkae a func that counts teh words" | crea una funzione che conta le parole |
| Inglese | "write teh rezult to outpt.txt" | scrivi il risultato in outpt.txt (output.txt) |
| Spagnolo | "le el archvo y kita las lineas vasias" | lee el archivo; quita las lineas vacias |
| Spagnolo | "has una funcion ke cuenta palbras" | crea una funcion que cuenta palabras |
| Spagnolo | "garda el resultdo en un archvo nuevo" | guarda el resultado en un archivo nuevo |

Errori introdotti nel set (copertura): ogni frase contiene 2 o 3 errori del catalogo 7.1,
scelti con un generatore controllato (seed fisso), piu' almeno una frase per lingua con mix EN/ES.

Criteri di superamento (tutti obbligatori):
1. **Intent corretto**: almeno il 90% delle 30 frasi produce un intento con tutte le azioni chiave attese (le azioni chiave sono scritte nel golden set).
2. **Zero silenzi pericolosi**: nessuna frase incompresa che passa come capita (confidenza alta con intento sbagliato). Ogni errore deve essere o corretto o dichiarato "non capito".
3. **Nessun crash**: 30 su 30 elaborate senza errori di sistema.
4. **Confidenza onesta**: nelle frasi dove il sistema sbaglia, la confidenza media e' sotto 0.5 (il sistema sa di non sapere).
5. **Apprendimento**: rifacendo il test una seconda volta, il punteggio non peggiora e le correzioni confermate nella prima passata non si richiedono.

Se un criterio fallisce: si registra il fallimento, le frasi colpevoli si aggiungono alla KB come casi difficili, e si itera. Il registro conserva la storia: si vede il miglioramento.

---

## 8. Metriche di comprensione

Tutto si misura e si registra. Niente "sembra funzionare".

### 8.1 Le tre metriche principali

| Metrica | Cosa misura | Formula | Dove si misura |
|---|---|---|---|
| Accuratezza della comprensione (AC) | quanto spesso il Modello di Comprensione e' giusto | AC = comprensioni verificate corrette / comprensioni totali | golden set per linguaggio + casi reali |
| Robustezza al rumore (RR) | quanto il rumore umano abbassa l'accuratezza | RR = AC(rumoroso) / AC(pulito); + delta per tipo di errore (7.1) | protocollo sezione 7.3, 30 frasi |
| Copertura (CP) | quanta parte dell'albero concreto e' mappata in UAST | CP = nodi_mappati / nodi_totali (pesati per rilevanza) | ogni comprensione, dal campo uast del Modello |

Come si verifica "corretto" (per AC): tre livelli, in ordine di forza.
1. **Verifica con esecuzione**: se il codice ha test, il Modello deve predire il comportamento dei test. Predizione giusta = corretto. (Il livello piu' forte, quando possibile.)
2. **Verifica incrociata**: si rigenera un riassunto del comportamento e lo si confronta con il golden set scritto a mano. Confronto assistito dal modello, revisione a campione da Whyed.
3. **Verifica del testo**: per le frasi umane, l'intento del modello contro l'intento atteso del golden set (uguale al protocollo 7.3).

La copertura per rilevanza: non tutti i nodi valgono uguale. Un nodo `IDENTIFIER` opzionale
pesa 0.5, un nodo FUNCTION pesa 3. La tavola dei pesi sta in configurazione e si aggiorna con le misure.

### 8.2 Come si registra ogni misura

File: `E:\Dev\WhyCode\registro\comprensione.jsonl` (una riga JSON per evento, si aggiunge in coda).
Stessa disciplina di WhyObliter: il registro e' la memoria, si puo' rileggere e rigiocare.

Record minimo per evento di comprensione:

    {
      "evento": "comprensione",
      "id": "comp-2026-10-17-0001",
      "quando": "2026-10-17T14:30:00+02:00",
      "input_hash": "9f2c...ab",
      "tipo_input": "sorgente_linguaggio_noto",
      "linguaggio": "python",
      "grammatica_usata": "tree-sitter",
      "iterazioni_inferenza": 0,
      "metriche": { "ac": 1.0, "cp": 1.0, "rr": null },
      "confidenza_generale": 0.86,
      "esito": "verificata",
      "note": []
    }

Record per il ciclo di inferenza (un record per iterazione del ciclo di sezione 4):

    {
      "evento": "inferenza_iterazione",
      "linguaggio": "taskflow",
      "iterazione": 2,
      "esito": "fallito",
      "errore_parser": "line 4 col 24: expected NUMERO, found 1.22",
      "grammatica_hash": "ab12...",
      "quando": "2026-10-17T14:31:10+02:00"
    }

Regole del registro:
1. Ogni riga e' immutabile: non si corregge, si aggiunge.
2. Ogni riga ha un hash dell'input: lo stesso input ripetuto si riconosce.
3. A fine giornata (o a richiesta) si produce un riassunto: AC media per linguaggio, RR, CP, tentativi falliti.
4. Il riassunto e' la base per decidere dove migliorare: il linguaggio con AC bassa studia prima fatti nuovi; il tipo di errore 7.1 con delta peggiore riceve la contromisura prima.

### 8.3 Golden set: come si costruisce e si congela

1. Per ogni linguaggio studiato: 20 frammenti diversi (da 5 a 50 righe) con comprensione attesa scritta a mano.
2. Per le frasi umane: le 30 del protocollo 7.3, con intento atteso.
3. Il set si congela: hash del file di golden set registrato. Se cambia, il cambio si registra con data e motivo (altrimenti i confronti tra periodi non valgono).
4. Ogni aggiunta di linguaggio nuovo parte con il suo golden set gia' pronto: prima di dire "lo conosco", ci passa.

---

## 9. Scheda di studio di un linguaggio

Quando un linguaggio e' stato studiato (noto o inferito), si salva una scheda permanente.
Formato definitivo in SPEC-06 (knowledge base). Qui i campi minimi che la comprensione deve produrre.

| Campo | Contenuto | Esempio |
|---|---|---|
| id | identificatore della scheda | kb:taskflow |
| nome e alias | come si chiama e come si riconosce | TASKFLOW, task-flow |
| riconoscimento | estensioni, shebang, pattern di keyword | estensione .task, pattern "riga che inizia con una di: TASK READ FILTER MAP WRITE" |
| grammatica | tipo (tree-sitter, inferita, fornita), testo BNF/hash, confidenza | inferita, hash ab12..., confidenza 0.6 |
| tabella di mapping UAST | per ogni regola nativa, l'etichetta universale e le eccezioni | task -> FUNCTION; read -> IO_EFFECT |
| idiomi noti | modi tipici di scrivere le cose in questo linguaggio | "un task per file", "i comandi in sequenza" |
| trappole note | cose che ingannano la comprensione | "READ accetta sia stringhe sia nomi" |
| esempi canonici | i 5 esempi migliori per riprovare la grammatica in futuro | le 5 righe TASKFLOW della sezione 4.4 |
| esempi negativi | gli esempi che la grammatica deve rifiutare | quelli della sezione 4.4 |
| byte del parser | dove sta il parser compilato o la grammatica locale | cache: E:\Dev\WhyCode\grammatiche\taskflow\ |
| contatore usi | quante volte il linguaggio e' stato usato | 3 |
| data prima comprensione / ultima revisione | quando | 2026-10-17 / 2026-10-17 |
| provenienza | da dove viene tutto: input, documentazione, chi lo ha fornito | 5 esempi forniti da Whyed |
| esito test | AC, CP, RR misurate su questa scheda | AC 1.0 su 5 casi |

Regola: la scheda si aggiorna ogni volta che il linguaggio viene toccato.
"Ogni volta piu' resistente" significa questo: la seconda volta che si vede TASKFLOW, la grammatica e' gia' pronta,
il mappatore e' gia' pronto, e il ciclo di inferenza non serve piu'.

---

## 10. Decisioni aperte e alternative scartate

### 10.1 Decisioni aperte (da chiudere in Fase 0 o inizio Fase 1)

| # | Decisione | Opzioni | Proposta di partenza |
|---|---|---|---|
| 1 | Formato interno della grammatica | BNF puro, EBNF, formato Lark | EBNF compatibile Lark: i parser esistono e sono maturi |
| 2 | Parser per l'inferenza | libreria Lark (Python) o parser Earley proprio | Lark se WhyCode e' Python; altrimenti Earley proprio (e' il parser piu' semplice da scrivere per grammatiche inferite) |
| 3 | Linguaggio di implementazione di WhyCode | Python, Rust, TypeScript | Python per la Fase 0 (Lark, py-tree-sitter maturi); Rust se servira' velocita' |
| 4 | UAST schema | 30 etichette fisse come qui, oppure estendibile | Fisse in Fase 1, con procedura di aggiunta documentata dopo |
| 5 | Modello per l'inferenza | quale WhyLocalLM come minimo | Da misurare: un modello piccolo va bene per DSL semplici; soglia da trovare con la misura |
| 6 | N_max e soglie | 12 iterazioni, stop a 3 errori identici, soglia "non capito" 0.5 | Valori iniziali come scritti, da ricalibrare con le misure di sezione 8 |
| 7 | Mapping per-linguaggio | tabelle a mano o inferite dal modello con verifica | A mano per i 3 linguaggi della Fase 2 (Python, JS, C); inferite per i DSL |
| 8 | Propagazione degli effetti | quanti salti verso l'alto | Proposta: effetti propagati fino a 2 livelli sopra la chiamata; misurabile |

### 10.2 Alternative scartate e perche'

| Alternativa | Perche' scartata |
|---|---|
| Solo regex, niente parser | Fragile e cieca al contesto. Una regex non conosce l'annidamento. Utile solo come ultima emergenza (gradino 6 della sezione 3.4). |
| Solo LLM, niente parser di verifica | Il modello puo' allucinare una grammatica che "sembra" giusta. Senza parser che prova, non c'e' verifica. Contro la filosofia: la verifica e' meccanica. |
| Grammatiche di tutti i linguaggi precaricate | Contraddice il principio 2: "non sapere, saper studiare". Inoltre non scala a quelli che esisteranno. |
| Parse universale GLR sul testo grezzo senza modelli | Non "studia": applica una tecnica fissa. E gli errori diventano un muro. |
| Gettare via i nodi ERROR dell'albero | I nodi ERROR dicono dove sta il problema. Sono informazione, non sporcizia. |
| Correggere la frase umana solo col modello, senza normalizzazione | Il modello da solo perde 2,3 a 4,3 punti sui typo (MulTypo/WikiTypo). Normalizzazione e fonetica prima, modello dopo: due reti invece di una. |
| Indovinare l'intento quando la frase non si capisce | Vietato. Meglio "non ho capito" con confidenza bassa. Il silenzio pericoloso e' il fallimento peggiore (criterio 2 di 7.3). |
| UAST senza attributi nativi | Si perderebbe il linguaggio di partenza. L'UAST deve uniformare la lettura, non cancellare l'origine. |
| Cloud obbligatorio per la comprensione | Contro il vincolo: locale, privato, di Whyed. Il cloud e' solo escalation facoltativa. |

### 10.3 Domande aperte da girare a Whyed (una alla volta, a bottoni)

1. Il dizionario di abbreviazioni personali: lo costruiamo a mano con 20 voci o cresce solo da solo?
2. La verifica incrociata di AC (sezione 8.1, livello 2): vuoi revisionare tu un campione a settimana o ci fidiamo della auto-revisione con campione casuale registrato?
3. Per l'esempio TASKFLOW: il set di prova della milestone (PROGETTO.md, "prima prova a terra") vuole il suo mini linguaggio specifico o riusiamo TASKFLOW?

---

## Appendice A: glossario minimo

| Termine | Significato |
|---|---|
| CST | Concrete Syntax Tree: albero concreto, con ogni token e posizione |
| AST | Abstract Syntax Tree: albero che salta i dettagli non utili |
| UAST | Universal AST: albero di WhyCode, etichette universali |
| BNF / EBNF | notazioni per scrivere grammatiche |
| Parser Earley | parser che accetta qualsiasi grammatica senza restrizioni |
| tree-sitter | parser incrementale con grammatiche per centinaia di linguaggi |
| few-shot | pochi esempi nel prompt del modello |
| feedback loop | ciclo in cui gli errori del parser tornano al modello |
| golden set | insieme di prova congelato con risultati attesi scritti a mano |
| AC / RR / CP | accuratezza, robustezza al rumore, copertura (sezione 8) |
| nodo ERROR | nodo che tree-sitter mette dove non ha capito, senza crash |

## Appendice B: fonti della ricerca (dettagli specifici usati qui)

- Kajal (arXiv 2412.08842): ciclo di correzione fino a 10 iterazioni con errore del parser Lark come feedback; estrazione della grammatica dai tag nella risposta del modello; 45% senza few-shot, 60% con. Usato in 4.2 e 4.3.
- HyGenar (arXiv 2505.16978): inferenza da esempi positivi e negativi; la grammatica deve accettare tutti i positivi e rifiutare tutti i negativi; feedback "LLM-friendly". Usato in 4.2 (verifica negativa) e 4.6.
- Grammar prompting (NeurIPS 2023): predire prima la grammatica, poi generare. Usato in 4.1 come idea di fondo.
- Babelfish/UAST (source{d}): ruoli language-independent (Function, Call, Assignment, Import, Condition, Loop...). Ispirazione per le 30 etichette di sezione 5.2.
- YASA-UAST (Ant Group): UAST per analisi statica multi-linguaggio. Conferma che l'approccio e' attivo e praticabile.
- Tree-sitter (tree-sitter.github.io): parser incrementale, error-tolerant, query S-expression. Usato in tutta la sezione 3.
- MulTypo (ACL 2026) e WikiTypo (2025): i typo costano 2,3 a 4,3 punti ai modelli; serve addestramento a prova di rumore. Usato in 7.2 e nelle alternative scartate.
