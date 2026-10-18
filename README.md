# WhyCode

**Il linguaggio che studia i linguaggi al momento.**

WhyCode non impara i linguaggi in anticipo. Li studia al momento.
Legge esempi di un codice mai visto, tira su la grammatica, lo capisce.
Poi scrive nel linguaggio che serve: incastrato nello stile di casa,
verificato con i test, ottimizzato con numeri veri.

Nato dalle idee di Whyed. L'approccio ha due nomi che vanno a braccetto:
**WhyStocastic** (apre lo spazio: tante possibilita' vere) e
**WhyQuantum** (lo chiude: una scelta deterministica, registrata e rifacibile).
La memoria che cresce e' la parte viva di **WhyConsciousness**.

## La promessa

1. **Capire codice mai visto.** Anche solo da esempi, anche scritto male.
2. **Parlare ogni lingua.** Quelle che esistono e quelle che devono ancora nascere.
3. **Legarsi, non solo tradurre.** Il codice nuovo convive col vecchio.
4. **Scegliere in modo deterministico.** Stessa richiesta, stessa scelta. Ogni scelta e' registrata.
5. **Diventare piu' forte ogni volta.** Ogni linguaggio studiato resta in memoria.

## Come funziona, in cinque passi

```
 sorgenti, esempi o frasi umane scritte male
                      |
                      v
  1. studio al momento        grammatica e significato, sul posto
                      |
                      v
  2. spazio delle varianti    tutte le realizzazioni possibili
                      |
                      v
  3. collasso deterministico  una scelta, registrata e rifacibile
                      |
                      v
  4. incastro e verifica      compila, passa i test, misura
                      |
                      v
  5. memoria                  la conoscenza si accumula
```

## Un assaggio

```
versione 1

funzione media(numeri: lista di numero) -> numero {
  variabile totale = 0
  variabile quanti = 0
  per ogni n in numeri {
    totale = totale + n
    quanti = quanti + 1
  }
  se quanti uguale 0 {
    ritorna 0
  }
  ritorna totale / quanti
}

test media_di_lista {
  dato valori = [2, 4, 6]
  atteso media(valori) uguale 4
}
```

## Prova subito (la Fase 0 gia' funziona)

Serve Node 22 o superiore.

```
npm install
npm test                            (240 test)

node build\tools\whycode.js controlla tests\fixtures\reali\calcolatrice.why
node build\tools\whycode.js stampa    tests\fixtures\reali\calcolatrice.why
node build\tools\whycode.js memoria vedi
npm run collaudo
```

`controlla` segue anche gli import e dice OK oppure elenca problemi e rimedi.
Tutto funziona a motore spento: nessuna rete, mai.

## Com'e' fatto

| Cartella | Cosa c'e' |
|---|---|
| `src\kernel` | il linguaggio base: lettura, scrittura, stampa, controllo. Dentro non compare mai il nome di un linguaggio reale |
| `src\memoria` | le schede dei linguaggi studiati, con indice e ricerca per somiglianza |
| `src\motore` | il cliente per WhyLocalLM (127.0.0.1:1235) |
| `tools\` | la riga di comando `whycode` e gli strumenti interni |
| `docs\` | le specifiche complete, dieci documenti |
| `tests\` | corpus validi e rotti, golden, programmi realistici |

## Stato (18/10/2026)

**Fase 0 completata e collaudata.**

Kernel completo col catalogo errori K-001..K-120 tutto coperto da test,
memoria, motore, riga di comando, 240 test verdi, collaudo profondo con
fuzz su 20000 mutazioni senza un problema.
`npm run collaudo` stampa COLLAUDO F0: SUPERATO.

Ordine di lettura consigliato: `PROGETTO.md` (la visione), poi
`docs\SPEC-01-KERNEL.md` (il linguaggio), poi gli altri livelli.

| Documento | Righe | Contenuto |
|---|---|---|
| `PROGETTO.md` | 241 | visione, parole di Whyed, stato dell'arte |
| `docs\SPEC-01-KERNEL.md` | 686 | grammatica, 9 concetti, tipi, errori, dialetti |
| `docs\SPEC-02-COMPRENSIONE.md` | 1176 | studiare al momento: tree-sitter, inferenza, UAST |
| `docs\SPEC-03-QUANTICO.md` | 1132 | superposizione, collasso, registro, replay |
| `docs\SPEC-04-SINTESI-INCROSTO.md` | 1701 | sintesi, incastro nel repo ospite, interop |
| `docs\SPEC-05-OTTIMIZZAZIONE.md` | 1243 | misura, protocollo, report before/after |
| `docs\SPEC-06-MEMORIA.md` | 1167 | schede linguaggio, knowledge base che cresce |
| `docs\SPEC-07-MOTORE-WHYLOCALLM.md` | 989 | ruoli del modello, prompt, fallback |
| `docs\SPEC-08-FONDAZIONI-FORMALI.md` | 475 | teoremi, invarianti, statistica di "notevole" |
| `docs\SPEC-09-ALGORITMI-CRITICI.md` | 559 | algoritmi in pseudocodice con test obbligatori |
| `docs\PIANO-IMPLEMENTAZIONE.md` | 855 | stack, moduli, fasi F0-F5, rischi |
| `docs\FORMATI.md` | 281 | formati su disco, 15 etichette UAST, esempi |

Totale: circa 10.500 righe di progettazione.

## Roadmap

| Fase | Cosa | Stato |
|---|---|---|
| 0 | Fondamenta: kernel, memoria, CLI, test | fatta |
| 1 | Comprensione: tree-sitter, grammatiche inferite, UAST | prossima |
| 2 | Sintesi e incastro: generare nel linguaggio giusto | |
| 3 | Spazio quantico: varianti e collasso registrato | |
| 4 | Interop: binding tra linguaggi | |
| 5 | Ottimizzazione e memoria cumulativa | |

**La prova che dimostra l'idea:** un mini linguaggio inventato al momento,
mai visto prima, descritto solo da esempi, viene capito e riscritto bene.
Poi una frase scritta male in due lingue umane viene capita lo stesso.

## Regole

Italiano semplice, frasi corte, niente trattini lunghi, niente emoji.
I documenti sono di progettazione e vanno approvati da Whyed.
