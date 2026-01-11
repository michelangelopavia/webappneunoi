# Documentazione Tecnica - neu [nòi]

Questa documentazione è rivolta agli sviluppatori che dovranno mantenere o estendere l'applicazione.

## Architettura del Sistema
Il progetto è una **Single Page Application (SPA)** con architettura disaccoppiata:
*   **Backend**: Node.js + Express + Sequelize (ORM) + SQLite.
*   **Frontend**: React + Vite + Tailwind CSS + ShadcnUI.
*   **Comunicazione**: API REST con autenticazione via JWT (JSON Web Token).

## Struttura del Codice
*   `/server`: Contiene la logica backend.
    *   `models.js`: Definizione di tutti i modelli del database (Sequelize).
    *   `database.js`: Configurazione della connessione SQLite.
    *   `routes/`: Directory con i controller API (suddivisi per entità, auth e integrazioni).
    *   `utils/`: Logiche core (calcolatore NEU, motore notifiche, generazione PDF, email).
*   `/client`: Contiene il frontend React.
    *   `src/api/neunoiClient.js`: Client API centralizzato che astrae tutte le chiamate al server.
    *   `src/components/`: Componenti UI riutilizzabili suddivisi per area (coworking, host, task, etc.).
    *   `src/pages/`: Pagine principali dell'applicazione.

## Logiche Chiave da Conoscere
1.  **Generatore di ID**: Il sistema usa una logica generica per le entità. Ogni nuova tabella aggiunta in `models.js` è automaticamente gestita dalle rotte CRUD in `routes/entities.js`.
2.  **Calcolatore NEU (`server/utils/neu_calculator.js`)**: Gestisce il valore dei turni host in base alle fasce orarie italiane (standard = 2.5, serale = 4.0, festivi = 6.0).
3.  **Ricalcolo Saldi (`server/utils/safe_recalc.js`)**: Questa è la logica più delicata. Non limite a sommare le transazioni, ma simula il flusso temporale per gestire i "bucket" di scadenza (FIFO - First In First Out).
4.  **Integrazioni**: Il sistema gestisce upload di file locali e invio email tramite SMTP configurabile via variabili d'ambiente.

## Manutenzione
*   **Database**: Si trova in `server/database.sqlite`. Può essere visualizzato con qualsiasi browser SQLite.
*   **Deploy**: Il fork attuale è configurato per Railway (backend) e hosting FTP (frontend).
*   **Build**: Eseguire `npm run build` nella cartella `client` per generare i file statici da caricare via FTP.
