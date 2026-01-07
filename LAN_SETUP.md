# Guida all'Installazione in Rete Locale (LAN)

Questa guida spiega come configurare il progetto per essere accessibile da altri dispositivi (PC, smartphone) collegati alla stessa rete Wi-Fi/LAN del computer server.

## Requisiti

*   Un PC (Server) su cui gira il progetto (Back-end e Front-end).
*   Altri dispositivi connessi alla stessa rete Wi-Fi del Server.

## Configurazione Automatica (Già applicata)

1.  **Frontend (Vite)**: Ho modificato il file `package.json` nel client per aggiungere il flag `--host`. Questo dice a Vite di ascoltare su tutte le interfacce di rete, non solo su `localhost`.
2.  **Configurazione API**: Il file `neunoiClient.js` è già configurato per cercare il server all'indirizzo IP locale del PC.
    ```javascript
    const API_URL = window.location.protocol + '//' + window.location.hostname + ':3000';
    ```
    Se accedi da `192.168.1.5`, il client cercherà le API su `192.168.1.5:3000`.

## Istruzioni Passo-Passo

### 1. Trova l'indirizzo IP del Server

Sul PC dove gira il progetto:
*   Apri un terminale (PowerShell o CMD).
*   Digita `ipconfig` e premi Invio.
*   Cerca la voce **Indirizzo IPv4** sotto la tua scheda Wi-Fi o Ethernet (es. `192.168.1.X` o `192.168.0.X`).
*   Annota questo indirizzo (es. `192.168.1.15`).

### 2. Configura il Firewall di Windows

Windows potrebbe bloccare le connessioni in ingresso. Devi permettere il traffico sulle porte **3000** (Server) e **5173** (Client Vite).

*   Apri **Windows Defender Firewall con sicurezza avanzata**.
*   Clicca su **Regole connessioni in entrata** -> **Nuova regola...**.
*   Seleziona **Porta** -> Avanti.
*   Seleziona **TCP** e **Porte locali specifiche**. Inserisci: `3000, 5173`. Avanti.
*   Seleziona **Consenti la connessione**. Avanti.
*   Seleziona tutti i profili (Dominio, Privato, Pubblico). Avanti.
*   Nome: "Neu Noi LAN Access". Fine.

*(In alternativa, quando avvii `npm run dev`, Windows potrebbe mostrarti un popup: assicurati di spuntare entrambe le caselle "Reti private" e "Reti pubbliche" e clicca "Consenti accesso").*

### 3. Avvia il Progetto (Se non è già in esecuzione)

Se il progetto è già in esecuzione, riavvialo per applicare la modifica `--host`.

**Terminale 1 (Server):**
```bash
cd server
npm run dev
```

**Terminale 2 (Client):**
```bash
cd client
npm run dev
```
Dovresti vedere nel terminale del client qualcosa come:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/
```

### 4. Connettiti dagli Altri Dispositivi

Prendi un telefono o un altro PC connesso al Wi-Fi.
Apri il browser (Chrome, Safari, ecc.) e vai all'indirizzo:

`http://<TUO_IP_SERVER>:5173`

(Esempio: `http://192.168.1.15:5173`)

### Risoluzione Problemi

*   **Pagina bianca o non carica**: Verifica di aver aperto le porte nel Firewall. Prova a disabilitare temporaneamente il firewall per testare.
*   **Errore API (Network Error)**: Significa che il frontend non riesce a contattare il backend.
    *   Assicurati che il server (porta 3000) sia raggiungibile.
    *   Prova a visitare `http://<TUO_IP_SERVER>:3000` dal dispositivo mobile. Dovresti vedere `{ message: 'Neu Noi Gestione Associazione API' }`. Se non lo vedi, il problema è il firewall sulla porta 3000.
