/**
 * Errore tipizzato di WhyCode.
 * Regola: fuori dai test non si lancia mai Error nudo, solo ErroreWhyCode.
 */
export class ErroreWhyCode extends Error {
  readonly codice: string;
  readonly rimediabile: boolean;

  constructor(codice: string, messaggio: string, opzioni?: { causa?: unknown; rimediabile?: boolean }) {
    super(messaggio, opzioni?.causa !== undefined ? { cause: opzioni.causa } : undefined);
    this.name = "ErroreWhyCode";
    this.codice = codice;
    this.rimediabile = opzioni?.rimediabile ?? false;
  }

  toJSON(): { codice: string; messaggio: string; rimediabile: boolean } {
    return { codice: this.codice, messaggio: this.message, rimediabile: this.rimediabile };
  }
}
