# SPEC-01-KERNEL.md
# Specifica del Kernel di WhyCode (Livello 0)

Stato: bozza completa scritta il 17/10/2026. Da approvare in Fase 0.
Fonte: PROGETTO.md e Appendice B di PIANO-IMPLEMENTAZIONE.md.
Ogni regola di questo documento e' numerata per poterla citare nei test e nei verbali.

---

## 1. Scopo del kernel e posto nell'architettura

Il kernel e' il livello 0 di WhyCode: la knowledge base di base.
E' l'unica parte del linguaggio che non cambia mai. Tutto il resto si appoggia qui.

Perche' esiste:
- Da' una lingua franca tra tutti i livelli: comprensione (1), spazio quantico (2), sintesi (3),
  ottimizzazione (4), memoria (5) leggono e scrivono tutti quanti forme del kernel.
- Da' stabilita': i dialetti e i linguaggi studiati cambiano ogni giorno, il kernel no.
- Da' verificabilita': un nucleo piccolo si testa in modo esaustivo. Un nucleo grande no.

Regola fondativa (R1): nel kernel non compare MAI il nome di un linguaggio specifico.
Niente Python, niente Java, niente JavaScript, niente C, niente di niente.
Se un concetto appartiene a un linguaggio e non a tutti, vive nei dialetti (sezione 8).

Il kernel NON e' un linguaggio di programmazione completo per scrivere applicazioni.
E' un linguaggio per dichiarare intenti, contratti, vincoli e verifiche.
Il codice vero per una macchina si genera al livello 3 (sintesi), nei linguaggi che esistono.

---

## 2. Grammatica formale completa (EBNF)

Convenzioni EBNF: `*` zero o piu', `+` uno o piu', `?` opzionale, `|` alternativa,
`"x"` terminale letterale, parentesi per raggruppare. Tutto minuscolo.
I terminali sono parole chiave in italiano. Gli identificatori sono minuscoli con trattino basso.

```
G-001  file            = versione? blocco_top*
G-002  versione        = "versione" numero_intero riga
G-003  blocco_top      = blocco_intento | blocco_vincoli | blocco_uscita
                       | blocco_dialetto | blocco_usa | blocco_tipo | blocco_funzione
                       | blocco_effetto | blocco_test | riga_importa | blocco_dato
G-004  blocco_intento  = "intento" identificatore "{" elemento_intento* "}"
G-005  elemento_intento = blocco_dato | blocco_funzione | blocco_effetto
                       | riga_vincolo | blocco_test | riga_descrizione
G-006  riga_descrizione = "descrizione" testo riga
G-007  blocco_vincoli  = "vincoli" "{" coppia* "}"
G-008  blocco_uscita   = "uscita" "{" voce_uscita* "}"
G-009  voce_uscita     = identificatore riga | coppia
G-010  coppia          = chiave_vincolo ":" valore_coppia riga
G-011  blocco_dato     = "dato" identificatore (":" tipo)? ("=" espressione)? riga
                       | "variabile" identificatore (":" tipo)? "=" espressione riga
G-012  blocco_funzione = "funzione" identificatore "(" parametri? ")" ("->" tipo)? corpo_funzione?
G-013  corpo_funzione  = "{" istruzione* "}"
G-014  parametri       = parametro ("," parametro)*
G-015  parametro       = identificatore ":" tipo | identificatore | tipo
G-016  blocco_effetto  = "effetto" identificatore "(" parametri? ")" ("->" tipo)? riga
G-017  blocco_tipo     = "tipo" identificatore_opaco riga
G-018  blocco_test     = "test" identificatore "{" riga_test* "}"
G-019  riga_test       = blocco_dato | riga_verifica | riga_atteso
G-020  riga_verifica   = "verifica" espressione riga
G-021  riga_atteso     = "atteso" espressione riga
G-022  blocco_dialetto = "dialetto" identificatore "{" riga_dialetto* "}"
G-023  riga_dialetto  = "aggiunge" "tipo" identificatore_opaco riga
                       | "aggiunge" "blocco" identificatore riga
                       | "usa" "solo" "il" "kernel" riga
G-024  blocco_usa      = "usa" "dialetto" identificatore riga
G-025  riga_importa    = "importa" identificatore "da" testo riga
G-026  riga_vincolo    = "vincolo" espressione riga

G-027  istruzione      = blocco_dato | riga_ritorna | blocco_se | blocco_per
                       | blocco_mentre | riga_verifica | riga_chiudi | riga_espressione
                       | riga_assegnazione
G-028  riga_ritorna    = "ritorna" espressione? riga
G-029  riga_chiudi     = "chiudi" riga
G-030  blocco_se       = "se" espressione "{" istruzione* "}" blocco_altrimenti?
G-031  blocco_altrimenti = "altrimenti" ("se" espressione)? "{" istruzione* "}"
G-032  blocco_per      = "per" "ogni" identificatore "in" espressione "{" istruzione* "}"
G-033  blocco_mentre   = "mentre" espressione "{" istruzione* "}"

G-034  espressione     = o_espressione
G-035  o_espressione   = e_espressione ("o" e_espressione)*
G-036  e_espressione   = confronto ("e" confronto)*
G-037  confronto       = somma (("uguale" | "diverso" | "<" | ">" | "<=" | ">=") somma)?
G-038  somma           = prodotto (("+" | "-") prodotto)*
G-039  prodotto        = unario (("*" | "/" | "%") unario)*
G-040  unario          = "non" unario | "-" unario | chiamata
G-041  chiamata        = atomo ("(" argomenti? ")")*
G-042  argomenti       = espressione ("," espressione)*
G-043  atomo           = numero | testo | "vero" | "falso" | "niente"
                       | identificatore | lista | mappa | "(" espressione ")"

G-044  lista           = "[" (espressione ("," espressione)*)? "]"
G-045  mappa           = "{" (testo ":" espressione ("," testo ":" espressione)*)? "}"

G-046  tipo            = "testo" | "numero" | "booleano" | "niente"
                       | "lista" "di" tipo | "mappa" "di" tipo "a" tipo
                       | identificatore_opaco
G-047  identificatore_opaco = lettera_maiuscola lettera_minuscola_o_basso*

G-048  valore_coppia   = testo | numero | booleano | identificatore
G-049  booleano        = "vero" | "falso"
G-050  numero          = numero_intero | numero_decimale
G-051  numero_intero   = cifra+
G-052  numero_decimale = cifra+ "." cifra+
G-053  testo           = "\"" carattere* "\""
G-054  identificatore  = lettera_minuscola (lettera_minuscola_o_basso | cifra)*
G-055  lettera_minuscola = "a".."z" | lettera_accentata
G-056  lettera_maiuscola = "A".."Z"
G-057  lettera_minuscola_o_basso = lettera_minuscola | "_"
G-058  cifra           = "0".."9"
G-059  riga            = fine_riga | commento? fine_riga
G-060  commento        = "#" carattere* fine_riga
G-061  riga_espressione = espressione riga
G-062  riga_assegnazione = identificatore "=" espressione riga
G-063  chiave_vincolo  = identificatore | "uscita" | "test" | "stile"
```

Note alla grammatica (N1..N8):

- N1. Un file e' una sequenza di blocchi di primo livello (G-001). L'ordine non conta,
  tranne la direttiva `versione` (G-002) che, se c'e', sta nella prima riga utile.
- N2. I commenti (G-060) arrivano fino a fine riga e valgono ovunque.
- N3. L'indentazione non e' significativa: i blocchi si delimitano con le graffe.
  La convenzione di scrittura e' 2 spazi per livello. Il pretty-print (sezione 10, test T-07)
  usa sempre 2 spazi.
- N4. Le lettere accentate sono ammesse negli identificatori (G-055) e nei testi.
  Le parole chiave restano senza accenti.
- N5. I tipi opachi (G-047) iniziano con maiuscola: sono l'unico posto dove compare la maiuscola
  in un identificatore. Segnale visivo: "questo tipo non e' universale, viene da un dialetto".
- N6. La forma `funzione nome( ... ) -> tipo` senza corpo (G-012 con corpo_funzione assente)
  e' una dichiarazione di contratto: dice COSA deve fare, non COME. I livelli superiori
  la realizzano. La stessa sintassi con corpo `{ ... }` e' una definizione eseguibile.
- N7. `effetto` (G-016) dichiara sempre una capacita' che tocca il mondo esterno
  (leggere, scrivere, rete, orologio, casualita', stato condiviso). Nessun corpo: la
  realizzazione concreta la sceglie il livello 3. La purezza della funzione si deduce
  da cosa chiama (sezione 3, vocabolo "effetto").
- N8. Ogni riga di codice finisce con fine_riga. Il punto e virgola non esiste.
- N9. Dentro i testi le sequenze di escape sono: \n (a capo), \t (tabulazione), \" (virgoletta),
  \\ (barra inversa). Ogni altra sequenza e' errore K-004.
- N10. In `atteso` e `verifica` l'espressione deve essere booleana: l'uguaglianza si scrive
  con `uguale` come in ogni confronto (`atteso r uguale 4`). Non esiste un separatore speciale.
- N11. Un parametro puo' avere nome e tipo (`x: numero`), solo nome, o solo tipo
  (`conta(testo)`, usato nei contratti dell'intento). I tipi opachi con la maiuscola e i
  tipi universali (parole chiave) non si confondono con i nomi.
- N12. Le righe `dato` e `variabile` (G-011) possono stare anche in cima al file (G-003),
  oltre che dentro intenti, funzioni e test: un file .why puo' essere anche uno script
  con i suoi valori in testa.
- N13. Le chiavi dei vincoli (G-063) sono nomi di configurazione: oltre agli identificatori
  normali sono ammesse le tre parole riservate `uscita`, `test` e `stile`, che sono il
  vocabolario dei desiderata operativi (sezione 3.8). Ogni altra parola riservata resta
  vietata (K-005). I nomi non contengono mai il trattino: si usa l'underscore.

---

## 3. I nove concetti universali

Sono i mattoni. Valgono per qualunque linguaggio presente o futuro perche' non descrivono
sintassi: descrivono cio' che ogni linguaggio deve comunque esprimere.

### 3.1 Intenzione (il concetto primo)

- Sintassi: blocco `intento nome { ... }` (G-004), oppure la direttiva `descrizione "..."` (G-006).
- Semantica: dichiara COSA si vuole ottenere, mai COME. E' il punto di partenza di tutto WhyCode.
- Esempio:
```
intento conta_righe {
  descrizione "contare le righe non vuote di un file di testo"
  effetto leggi(percorso: testo) -> testo
  funzione conta(testo) -> numero
}
```
- Errori tipici: mettere il come dentro l'intento (es. nominare librerie concrete); duplicare
  intenti con lo stesso nome nello stesso file (K-101).

### 3.2 Valore

- Sintassi: G-043 (atomo). Letterali: numero (12, 3.14), testo ("ciao"), booleano (vero, falso),
  niente, lista [1, 2, 3], mappa {"chiave": 1}.
- Semantica: un valore e' immutabile. I valori non hanno identita', solo contenuto.
- Errori tipici: lista con tipi mescolati senza dichiararlo (K-102, solo avviso); mappa con
  chiavi non testo (K-103).

### 3.3 Tipo

- Sintassi: G-046. Universali: testo, numero, booleano, niente, lista di T, mappa di T a T.
  Opachi: iniziano con maiuscola e vengono dai dialetti.
- Semantica: un tipo e' un insieme di valori piu' le operazioni valide su di essi.
  Il kernel controlla i tipi quando sono dichiarati. Senza dichiarazione, inferisce.
- Errori tipici: usare un tipo opaco senza dichiarare `usa dialetto` (K-104); sommare testo
  e numero (K-105).

### 3.4 Funzione

- Sintassi: G-012. Con corpo e' eseguibile; senza corpo e' contratto.
- Semantica: prende parametri, restituisce un valore, non tocca il mondo (se lo tocca,
  deve chiamare un effetto dichiarato e lo dichiara nella sua riga). Una funzione pura
  e' verificabile in isolamento: stesso ingresso, stesso risultato.
- Esempio:
```
funzione somma(a: numero, b: numero) -> numero {
  ritorna a + b
}
```
- Errori tipici: chiamare un effetto dentro una funzione dichiarata senza effetto (K-106);
  ritorno mancante su un ramo (K-107).

### 3.5 Flusso

- Sintassi: `se`/`altrimenti` (G-030, G-031), `per ogni` (G-032), `mentre` (G-033),
  `ritorna` (G-028), `chiudi` (G-029, esce dal ciclo).
- Semantica: sequenziale, un'istruzione alla volta. `mentre` richiede una condizione che
  possa diventare falsa: il kernel lo verifica quando puo' (avviso K-108 se non lo dimostra).
- Errori tipici: ciclo mentre senza uscita dimostrabile (K-108, avviso); codice dopo `ritorna`
  nella stessa sequenza (K-109, avviso).

### 3.6 Effetto

- Sintassi: dichiarazione G-016; chiamata come funzione normale.
- Semantica: un effetto e' l'unico modo per toccare il mondo: leggere, scrivere, rete,
  orologio, casualita', stato condiviso. Ogni effetto e' dichiarato, mai implicito.
  Le funzioni che chiamano effetti diventano "con effetti" e questo si propaga.
- Esempio:
```
effetto leggi(percorso: testo) -> testo
funzione prima_riga(percorso: testo) -> testo {
  dato contenuto = leggi(percorso)
  ritorna prima_di(contenuto, "\n")
}
```
- Errori tipici: effetto non dichiarato (K-106); uso di effetto nella valutazione di un
  vincolo (i vincoli devono restare puri, K-110).

### 3.7 Dato

- Sintassi: `dato nome: tipo = espressione` (immutabile) e `variabile nome = espressione`
  (mutabile). La riassegnazione si scrive `nome = espressione` (riga_assegnazione, G-062)
  e vale solo per le `variabile`.
- Semantica: `dato` lega un nome a un valore per sempre. `variabile` ammette riassegnazione
  nella stessa sequenza. Il kernel preferisce i dati immutabili: le variabili sono per
  accumulare o per i cicli.
- Errori tipici: riassegnare un `dato` (K-111); usare un nome prima di dichiararlo (K-112).

### 3.8 Vincolo

- Sintassi: riga `vincolo espressione` dentro un intento (G-026), oppure blocco
  `vincoli { chiave: valore }` a livello file (G-007).
- Semantica: un vincolo e' un'affermazione che deve restare vera. Il blocco `vincoli` raccoglie
  i desiderata operativi (uscita, test, stile e altri). La riga `vincolo` e' una condizione
  sulla correttezza che il sistema verifica in ogni fase e non viola mai.
- Esempio:
```
vincolo risultato >= 0
vincoli {
  uscita: automatico
  test: forniti
  stile: repo_ospite
}
```
- Errori tipici: vincolo non verificabile (K-113, deve essere decidibile sui dati); vincolo
  che usa effetti (K-110).

### 3.9 Test

- Sintassi: blocco `test nome { ... }` (G-018) con dentro: dati, `verifica espressione`,
  `atteso espressione` (booleana: l'uguaglianza si scrive con `uguale`).
- Semantica: un test e' una promessa verificabile. Nessun "fatto" senza test verde (regola R2).
- Esempio:
```
test somma_semplice {
  dato r = somma(2, 2)
  atteso r uguale 4
}
```
- Errori tipici: test senza atteso ne' verifica (K-114); atteso uguale fra due espressioni
  identiche (il test non prova niente, avviso K-115).

---

## 4. Sistema di tipi minimale universale

### 4.1 I tipi universali

| Tipo | Cosa contiene | Operazioni valide |
|---|---|---|
| testo | sequenza di caratteri Unicode | + (unione), lunghezza, confronto, contiene |
| numero | intero o decimale, illimitato in teoria | + - * / %, confronto |
| booleano | vero, falso | e, o, non, confronto |
| niente | l'assenza di valore | confronto con niente |
| lista di T | sequenza ordinata di valori T | indice, lunghezza, per ogni, + (unione) |
| mappa di T a T | associazione chiave/valore | chiave, contiene, per ogni |

### 4.2 Tipi opachi (per i dialetti)

Un tipo opaco e' un tipo definito da un dialetto, ignoto al kernel.
Il kernel lo tratta in modo trasparente: lo trasporta, lo passa alle funzioni, lo confronta
solo se il dialetto fornisce il confronto.
Esempi di tipi opachi (illustrativi, definiti nei dialetti, non nel kernel): `Connessione`,
`Finestra`, `CodiceGenerato`. La maiuscola segnala che il tipo viene da fuori.

### 4.3 Inferenza minima

- Se il tipo e' dichiarato, vale la dichiarazione.
- Se manca, il kernel inferisce dal valore piu' semplice:
  - letterale numero -> numero; testo -> testo; vero/falso -> booleano.
  - lista vuota senza contesto -> errore K-116 (impossibile inferire).
  - `niente` -> tipo niente.
- L'inferenza non risolve catene complesse: quando non sa, chiede la dichiarazione
  (errore K-116 con suggerimento).

### 4.4 Compatibilita'

- numero accetta interi e decimali (un solo tipo numerico, niente conversioni obbligatorie).
- Non esistono conversioni implicite fra testo e numero: servono funzioni esplicite.
- lista di T accetta solo elementi T. Un elemento di tipo diverso e' K-102.
- niente e' compatibile solo con se stesso: per "forse un valore" si usera' un dialetto
  (tipo opaco `Forse`), non il kernel. Motivazione: tenere il kernel piccolo.

---

## 5. Unita' e moduli

- Un file `.why` e' un'unita': ha un nome di file e contiene blocchi di primo livello.
- Import: `importa nome da "percorso.why"` (G-025). Il percorso e' relativo al file che importa.
  Porta in scope il nome richiesto: una funzione, un effetto, un tipo, un intento.
  Import selettivo: un nome per riga importa un nome per volta. Niente import globali impliciti.
- Ogni nome importato e' immutabile nel file che lo importa.
- Cicli di import vietati: errore K-117 con l'elenco del ciclo.
- Versionamento della grammatica: la direttiva `versione 1` (G-002) dichiara la versione della
  grammatica che il file usa. Regola: il kernel accetta sempre la versione corrente e la
  precedente. Quando in futuro la grammatica cambiera', i file vecchi restano validi.
- Compatibilita' futura: le parole chiave del kernel sono riservate e non si riciclano con
  altri significati. Le aggiunte future usano parole nuove. Le rimozioni seguono il ciclo
  di deprecazione (avviso per una versione, poi errore).

---

## 6. Dodici esempi progressivi

Nessun esempio contiene nomi di linguaggi reali (regola R1). Tutti sono file .why validi.

### Esempio 01: un valore
```
dato saluto = "ciao"
```

### Esempio 02: funzione pura con corpo
```
funzione doppio(n: numero) -> numero {
  ritorna n * 2
}
```

### Esempio 03: testo
```
funzione unisci(a: testo, b: testo) -> testo {
  ritorna a + " " + b
}

test unisci_con_spazio {
  atteso unisci("ciao", "mondo") uguale "ciao mondo"
}
```

### Esempio 04: lista e per ogni
```
funzione somma_tutto(numeri: lista di numero) -> numero {
  variabile totale = 0
  per ogni n in numeri {
    totale = totale + n
  }
  ritorna totale
}

test somma_tre {
  atteso somma_tutto([1, 2, 3]) uguale 6
}
```

### Esempio 05: se e altrimenti
```
funzione classifica(n: numero) -> testo {
  se n < 0 {
    ritorna "negativo"
  } altrimenti se n uguale 0 {
    ritorna "zero"
  } altrimenti {
    ritorna "positivo"
  }
}
```

### Esempio 06: variabile e ciclo mentre
```
funzione conta_rovescio(inizio: numero) -> lista di numero {
  variabile n = inizio
  variabile risultato: lista di numero = []
  mentre n > 0 {
    risultato = risultato + [n]
    n = n - 1
  }
  ritorna risultato
}
```

### Esempio 07: effetto dichiarato e usato
```
effetto leggi(percorso: testo) -> testo

funzione prime_righe(percorso: testo, quante: numero) -> lista di testo {
  dato contenuto = leggi(percorso)
  dato righe = dividi(contenuto, "\n")
  ritorna prendi(righe, quante)
}
```

### Esempio 08: vincolo di correttezza
```
intento conto_valido {
  effetto leggi(percorso: testo) -> testo
  funzione conta(testo) -> numero
  vincolo conta("una\ndue\n") >= 0
}
```

### Esempio 09: test completo con verifica
```
funzione media(numeri: lista di numero) -> numero {
  se lunghezza(numeri) uguale 0 {
    ritorna 0
  }
  ritorna somma_tutto(numeri) / lunghezza(numeri)
}

test media_semplice {
  dato r = media([2, 4, 6])
  atteso r uguale 4
  verifica r <= 6
}
```

### Esempio 10: import tra file
```
# file: elabora.why
importa conta_righe da "conta.why"

intento report {
  effetto leggi(percorso: testo) -> testo
  dato risultato = conta_righe(leggi("report.txt"))
}
```

### Esempio 11: modulo completo (intento, vincoli, uscita, test)
```
versione 1

intento pulisci_righe {
  descrizione "leggere un file, togliere le righe vuote, restituire il testo pulito"
  effetto leggi(percorso: testo) -> testo
  funzione pulisci(testo) -> testo
  vincolo lunghezza(pulisci("a\n\nb")) uguale 3
}

vincoli {
  uscita: automatico
  test: forniti
  stile: repo_ospite
}

uscita {
  codice
  test_verdi
  benchmark
}

test pulisci_semplice {
  atteso pulisci("a\n\nb\n\n") uguale "a\nb"
}
```

### Esempio 12: dialetto con tipo opaco (uso, non definizione)
```
usa dialetto grafica

intento disegna_punto {
  descrizione "disegnare un punto su una superficie"
  effetto apri(larghezza: numero, altezza: numero) -> Superficie
  effetto punto(s: Superficie, x: numero, y: numero)
}
```
`Superficie` e' un tipo opaco: il kernel lo trasporta senza conoscerlo. La sua definizione
vive nel dialetto `grafica` (sezione 8), non qui.

---

## 7. Catalogo errori del kernel

Formato: codice, nome, quando scatta, messaggio tipo, rimedio.
Convenzione: K-0xx sintassi, K-1xx semantica (le voci marcate "avviso" non bloccano: K-102, K-108, K-109, K-115), K-2xx riservati al futuro.

| Codice | Nome | Quando | Rimedio |
|---|---|---|---|
| K-001 | carattere inatteso | il tokenizer incontra un carattere fuori grammatica | controllare il carattere alla riga/colonna indicate |
| K-002 | graffa mancante | un blocco non si chiude | aggiungere `}` |
| K-003 | parentesi mancante | una chiamata o parametri aperti | chiudere `)` |
| K-004 | testo non chiuso | una stringa non finisce sulla riga | chiudere `"` |
| K-005 | parola riservata fuori posto | una parola riservata usata come nome, o dove il linguaggio non la vuole | scegliere un altro nome o controllare l'ordine |
| K-101 | nome duplicato | due blocchi con lo stesso nome nello stesso file | rinominare uno dei due |
| K-102 | tipo mescolato | lista con elementi di tipi diversi | usare tipi omogenei o un dialetto |
| K-103 | chiave mappa non testo | mappa con chiave non di tipo testo (impossibile nella grammatica attuale: le chiavi sono sempre testo) | usare chiavi di testo |
| K-104 | tipo opaco non dichiarato | uso di un tipo Maiuscolo senza `usa dialetto` | aggiungere la riga `usa dialetto` |
| K-105 | operazione fra tipi incompatibili | es. testo + numero, o una chiamata su un nome che non e' una funzione | convertire in modo esplicito |
| K-106 | effetto non dichiarato | chiamata a un effetto mai dichiarato | dichiarare l'`effetto` o togliere la chiamata |
| K-107 | ritorno mancante | un ramo di funzione valorizzata non ritorna | aggiungere il `ritorna` o un valore di default |
| K-108 | ciclo non dimostrabile | `mentre` la cui condizione potrebbe non cambiare | aggiungere mutazione visibile o usare `per ogni` (avviso) |
| K-109 | codice irraggiungibile | istruzioni dopo `ritorna` o `chiudi` nella stessa sequenza | togliere il codice morto (avviso) |
| K-110 | effetto dentro vincolo | un vincolo chiama un effetto | i vincoli restano puri |
| K-111 | dato riassegnato | assegnazione a un nome dichiarato `dato` | usare `variabile` se serve mutare |
| K-112 | nome non dichiarato | uso di un nome mai definito ne' importato | dichiararlo o importarlo |
| K-113 | vincolo non verificabile | vincolo che non e' un'affermazione booleana decidibile sui dati | riscrivere il vincolo come confronto |
| K-114 | test vuoto | blocco test senza atteso ne' verifica | aggiungere almeno un `atteso` |
| K-115 | test tautologico | atteso con due espressioni identiche | il test deve poter fallire (avviso) |
| K-116 | tipo non inferibile | manca la dichiarazione e non si puo' dedurre | aggiungere `: tipo` |
| K-117 | ciclo di import | due o piu' file che si importano a vicenda | rompere il ciclo spostando il nome condiviso |
| K-118 | maiuscola fuori posto | un nome che comincia con la maiuscola, o un tipo opaco che comincia con la minuscola | i nomi sono minuscoli, i tipi opachi maiuscoli |
| K-119 | dialetto senza la riga obbligatoria | blocco `dialetto` senza `usa solo il kernel` | aggiungere la riga dentro il dialetto (regola D3) |
| K-120 | annidamento troppo profondo | oltre 150 livelli di parentesi, liste, chiamate o blocchi uno dentro l'altro | spezza il codice in piu' passi, con nomi intermedi |

Regole di comunicazione degli errori (vale per tutto WhyCode):
1. Mai eccezioni crude: sempre codice, riga, colonna, messaggio, rimedio.
2. Un errore per volta per posizione: niente cascate rumorose sullo stesso punto.
3. Il messaggio e' in italiano semplice, massimo due righe.

---

## 8. Regole di estensione e dialetti

Cos'e' un dialetto: un'estensione dichiarata del kernel per un contesto specifico.
Un dialetto puo': definire tipi opachi, aggiungere blocchi nuovi, aggiungere parole
chiave nuove con prefisso riservato. Un dialetto NON puo' mai cambiare il significato di
cio' che esiste nel kernel.

Regole esatte (D1..D10):

- D1. Un dialetto si dichiara in un blocco `dialetto Nome { ... }` che puo' vivere in un file
  `.why` qualsiasi o in un file dedicato.
- D2. Un dialetto dichiara cosa aggiunge con righe `aggiunge tipo Nome` e
  `aggiunge blocco nome`, una per riga.
- D3. La riga `usa solo il kernel` e' obbligatoria in ogni dialetto: certifica che il dialetto
  non ridefinisce nulla del kernel. Se manca, errore K-119.
- D4. Un file che usa un dialetto lo dichiara con `usa dialetto Nome` (G-024) prima di usarlo.
- D5. Un dialetto non puo' rimuovere, rinominare o ridefinire: tipi universali, parole chiave
  del kernel, semantica dei nove concetti.
- D6. I tipi opachi del dialetto iniziano con la maiuscola (gia' visto in N5).
- D7. I blocchi nuovi di un dialetto usano nomi propri che non collidono con le parole chiave
  del kernel (elenco riservato in sezione 9). La collisione e' errore K-005.
- D8. Un dialetto e' isolato: se il dialetto sparisce, i file che lo usano danno l'errore K-104
  sul tipo o K-005 sul blocco, e nient'altro si rompe.
- D9. Il kernel non conosce i dialetti per nome: li tratta come dichiarazioni, mai come
  concetti. Regola R1 salva anche qui.
- D10. La registrazione dei dialetti disponibili vive nella memoria (SPEC-06, schede linguaggio),
  non nel kernel.

Esempio minimo di dialetto (illustrativo):
```
dialetto grafica {
  usa solo il kernel
  aggiunge tipo Superficie
  aggiunge blocco disegno
}
```

---

## 9. Formato del file .why

- Estensione: `.why`.
- Codifica: UTF-8 senza BOM. Fine riga: LF (il parser accetta anche CRLF e lo segnala nel
  pretty-print con LF).
- Struttura: sequenza di blocchi di primo livello (sezione 2, G-001).
- Convenzioni di scrittura (non obbligatorie, ma il pretty-print le impone):
  1. 2 spazi di indentazione per livello di blocco.
  2. Una dichiarazione per riga.
  3. I commenti `#` sopra la riga che spiegano, non a fianco.
  4. Gli identificatori delle funzioni iniziano con un verbo (leggi, pulisci, conta).
  5. I nomi dei test iniziano con `test_`.
- Parole chiave riservate (elenco chiuso, non usabile come identificatore):
  versione, intento, descrizione, dato, variabile, funzione, effetto, tipo, test, verifica,
  atteso, vincolo, vincoli, uscita, dialetto, aggiunge, usa, blocco, kernel, importa,
  se, altrimenti, per, mentre, ritorna, chiudi, vero, falso, niente, e, o, non,
  lista, mappa, numero, testo, booleano, uguale, diverso.
- Parole contestuali (valgono come parola chiave solo dove la grammatica le chiede,
  altrove possono fare da nome): il, di, a, da, ogni, in, solo.
- Esempio di file completo: vedi Esempio 11 (sezione 6).

---

## 10. Test del kernel

### 10.1 Casi obbligatori

| ID | Test | Criterio |
|---|---|---|
| T-01 | Parsing dei 12 esempi di sezione 6 | tutti parsano senza errori |
| T-02 | Parsing di 40 file .why di prova | 40 su 40 verdi |
| T-03 | Errori con posizione su 10 file rotti | ogni file da' il codice K atteso con riga e colonna esatte |
| T-04 | Roundtrip parse/stampa su 20 file | parse(stampa(parse(x))) uguale parse(x) |
| T-05 | File vuoto e file di soli commenti | entrambi validi, zero errori |
| T-06 | File con CRLF | valido, pretty-print in LF |
| T-07 | Pretty-print stabile | due passaggi di stampa producono lo stesso testo |
| T-08 | Parole chiave riservate | usare una parola riservata come nome da' K-005 |
| T-09 | Import fra due file | il nome importato e' visibile, il ciclo da' K-117 |
| T-10 | Dialetto: uso senza dichiarazione | tipo opaco senza `usa dialetto` da' K-104 |
| T-11 | Dialetto: `usa solo il kernel` obbligatoria | dialetto senza la riga da' errore di dialetto |
| T-12 | Semantica: funzione pura pura, funzione con effetto marcata | un effetto non dichiarato da' K-106; propagazione corretta |
| T-13 | Valutazione dei 12 esempi con corpo | ogni test interno passa (dove presente l'atteso) |

### 10.2 Golden files

- Cartella `tests\golden\kernel\`: per ogni caso, una coppia `nome.why` (input) e
  `nome.atteso` (pretty-print o esito atteso).
- Aggiornamento dei golden: solo con comando esplicito e con il diff letto riga per riga
  (stessa disciplina del `--conferma` di WhyObliter).

### 10.3 Il test R1 (nessun linguaggio nel kernel)

Il kernel non deve contenere nomi di linguaggi di programmazione.
Test automatico `T-R1`: cerca nel sorgente del kernel e nei file di esempio una lista nera
di nomi di linguaggi (python, javascript, java, typescript, rust, golang, ruby, php, csharp,
swift, kotlin, scala, perl, lua, fortran, cobol, haskell, elixir, erlang e le varianti
maiuscole e minuscole), a parola intera.
Esito atteso: zero occorrenze fuori dalle righe di commento che spiegano il test stesso.
Se il test trova un'occorrenza, il build fallisce.
Nota: questo documento puo' citare i nomi (serve alla regola), il codice no.

### 10.4 Cosa NON e' il kernel

Per chiarezza, il kernel non fa e non fara' mai:
1. non esegue codice di altri linguaggi (lo fa il motore, livello 3);
2. non conosce librerie concrete (le sceglie la sintesi);
3. non contiene cache di risultati (vive nel registro, livello 2);
4. non parla col modello locale (lo fa il motore, SPEC-07);
5. non ha una sintassi che cambia (stabilita' totale).

---

## 11. Decisioni aperte e alternative scartate

### 11.1 Decisioni da prendere in Fase 0

| ID | Decisione | Opzioni | Proposta |
|---|---|---|---|
| A-1 | Forma della grammatica | blocchi con graffe (bozza Appendice B) contro S-espressioni | blocchi con graffe: piu' leggibili per Whyed, l'italiano semplice vince |
| A-2 | Operatori | simbolici (+ - * /) contro parole (piu, meno) | simbolici: piu' corti e universali; le parole restano per e, o, non, uguale |
| A-3 | Mutabilita' | solo immutabili contro `dato` e `variabile` | entrambi: i cicli e gli accumulatori servono, ma `dato` e' il default |
| A-4 | Import | selettivo `importa nome da "file"` contro import del file intero | selettivo: esplicito e senza sorprese |
| A-5 | Forma dei dialetti | blocco dichiarativo (questo documento) contro file separati con estensione propria | blocco dichiarativo in F0; estensione separata solo se la pratica lo chiede |
| A-6 | Versione della grammatica | direttiva `versione 1` contro nessuna direttiva | direttiva presente: protegge i file vecchi quando il kernel evolve |
| A-7 | Errori: codici numerici contro parole | K-001 contro `graffa-mancante` | entrambi: codice per il log, nome per il messaggio |
| A-8 | Accenti negli identificatori | ammessi contro vietati | ammessi (G-055): Whyed scrive in italiano, il linguaggio lo rispetta |

### 11.2 Alternative scartate con motivazione

| Alternativa | Perche' scartata |
|---|---|
| S-espressioni (stile Lisp) | difficili da leggere per Whyed (dislessia): troppe parentesi, poca chiarezza. La forma a blocchi e' piu' vicina all'italiano |
| Sintassi Python-like con indentazione significativa | l'indentazione significativa rende fragili i file (spazi invisibili). Le graffe sono esplicite |
| Linguaggio di programmazione completo nel kernel | il kernel deve restare piccolo e stabile. Un linguaggio completo dentro il kernel violerebbe la stabilita' e la regola R1 |
| Nomi delle parole chiave in inglese | Whyed lavora in italiano e legge i file. L'inglese resta nel codice implementativo, non nella lingua di WhyCode |
| Un tipo `qualunque` (any) nel kernel | distrugge il controllo dei tipi e la verificabilita'. I casi incerti si risolvono con i dialetti |
| Tipi generici complessi nel kernel | utili ma non universali: appartengono ai dialetti |
| Numeri con tipi separati (intero, decimale) | la separazione crea conversioni e errori. Un solo tipo numerico e' piu' semplice e basta a WhyCode |

---

## Registro delle modifiche

| Data | Modifica | Autore |
|---|---|---|
| 17/10/2026 | Prima stesura completa (11 sezioni) | agente WhyCode |
| 17/10/2026 | Riconciliazione con gli esempi: blocco_dato in cima al file (G-003, N12), riga_assegnazione (G-062), % fra i prodotti, valori coppia senza virgolette (G-048), K-005 riscritto, K-118 aggiunto, parole contestuali in sezione 9, esempio 06 con tipo esplicito | agente WhyCode |
| 18/10/2026 | Chiavi dei vincoli con uscita/test/stile ammessi (G-063, N13); niente trattini nei nomi (test_verdi nell'esempio 11) | agente WhyCode |
| 18/10/2026 | Catalogo completo in codice: K-102, K-105 (precisato), K-106, K-107, K-108, K-109, K-113 (precisato), K-116, K-117, K-119; ogni codice del catalogo ha un test | agente WhyCode |
| 18/10/2026 | Collaudo profondo: K-120 per l'annidamento oltre 150 livelli (prima era un crash crudo), maiuscole accentate riconosciute come K-118, nome scheda con traversale rifiutato, import lunghi senza ricorsione | agente WhyCode |

Fine del documento.
