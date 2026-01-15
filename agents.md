# 🤖 Regole di Sviluppo e Review (Assistente Antigravity)

Questo documento definisce gli standard obbligatori per ogni modifica al codice del progetto NEU NOI, con un focus prioritario sulla **Sicurezza** e la **Stabilità**.

---

## 🛡️ 1. Sicurezza Informatica (Standard OWASP)

Ogni modifica deve rispettare i seguenti criteri derivati dal report di vulnerabilità:

### A. Controllo degli Accessi (Authorization)
- **API Generiche (`/api/entities`)**: 
    - L'accesso in lettura (LIST/GET) e scrittura (POST/PATCH/DELETE) a modelli critici (`User`, `TransazioneNEU`, `OrdineCoworking`, `AbbonamentoUtente`) deve essere limitato agli utenti con ruolo `admin` o `host`.
    - Gli utenti "Socio/Coworker" devono poter vedere solo i record associati al proprio `user_id`.
- **Prevenzione Privilege Escalation**:
    - Impedire la modifica dei campi `role`, `roles`, `saldo_neu`, `stato` delle utenze tramite l'API generica. Questi campi possono essere aggiornati solo da procedure server-side validate e protette.
- **Whitelist Campi Sensibili**:
    - Non restituire mai `password_hash` o altri dati privati nelle risposte JSON (usare `attributes: { exclude: [...] }` in Sequelize).

### B. Validazione e Sanificazione
- **Mass Assignment**: Validare sempre che i valori numerici siano positivi (es: `ingressi_consumati`, `importo_neu`) per evitare manipolazioni fraudolente.
- **XSS (Cross-Site Scripting)**: Sanificare ogni input testuale che verrà poi visualizzato in UI admin per prevenire l'esecuzione di script malevoli.
- **Account Protection**: Impedire a un utente di cambiare la propria email con una già esistente nel sistema (specialmente se appartiene a un admin).

---

## 🔒 2. Gestione Utenze e Approvazione
- **Default Inattivo**: Ogni nuovo utente registrato deve avere `stato: 'in_attesa'`.
- **Blocco Accesso**: Il middleware di autenticazione deve verificare che `stato === 'approvato'` prima di procedere, altrimenti restituire errore 403 (Forbidden).
- **Controllo Admin**: Solo un `super_admin`/`admin` può cambiare lo stato di un utente dopo aver verificato l'identità del socio.

---

## 🧪 3. Qualità del Software e Testing
- **Review Pre-Modifica**: Prima di ogni commit, l'assistente deve dichiarare: *"Ho verificato che questa modifica non introduce i buchi di sicurezza documentati nel report."*
- **Regression Testing**: Per ogni bug critico o vulnerabilità chiusa, creare un test automatico che ne verifichi la persistenza nel tempo.
- **Pre-commit Checks**: Eseguire test di integrazione sulle API prima di accettare il push del codice.

---

## 📝 4. Procedura di Lavoro
1. Analisi del compito.
2. Identificazione dei modelli e delle API coinvolte.
3. Esecuzione della checklist di sicurezza (sopra).
4. Proposta di implementazione.
5. Richiesta di approvazione manuale dell'utente prima delle modifiche strutturali.
