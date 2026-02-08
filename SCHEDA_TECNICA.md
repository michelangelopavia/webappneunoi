# Scheda Tecnica e Requisiti Infrastrutturali - App Gestionale "neu [nòi]"

## 1. Panoramica Tecnologica
L'applicazione è sviluppata con uno stack moderno e leggero, progettato per essere flessibile e facilmente manutenibile.

*   **Frontend**: React (Vite) - Applicazione Single Page (SPA).
*   **Backend**: Node.js con Express.
*   **Database**: SQLite (Attualmente su file locale, ma predisposto per migrazione a PostgreSQL/MySQL).
*   **ORM**: Sequelize.
*   **Gestione Email**: Nodemailer (SMTP) - Attualmente configurato per Gmail/Google Workspace.

---

## 2. Requisiti di Hosting e Risorse

### Backend (Node.js)
Per far girare il server API, serve un ambiente che supporti **Node.js (v18 o superiore)** in modalità persistente (demone/processo a lunga esecuzione).
*   **CPU**: Risorse minime (0.5 vCPU sono sufficienti per il traffico attuale).
*   **RAM**: ~256MB - 512MB (Consumo attuale molto basso).
*   **Spazio Disco**:
    *   **Codice**: < 100MB.
    *   **Database (SQLite)**: Attualmente è un file `.sqlite`. Cresce linearmente con l'uso. Per un'associazione media, difficilmente supererà i 500MB in un anno.
    *   **Uploads**: Se gli utenti caricano file (immagini profilo, documenti), questo è il punto critico. Serve uno spazio persistente (Volume/Disco) o un servizio esterno (es. S3/Google Cloud Storage).

**Nota Importante su SQLite in Cloud**: Piattaforme effimere come Railway, Heroku o Vercel **distruggono** il filesystem ad ogni deploy. Se usiamo SQLite, il database viene resettato ogni volta che aggiorniamo l'app, a meno che non si monti un **Volume Persistente**.

### Frontend (React)
Il frontend è statico (HTML/CSS/JS compilati). Può essere ospitato ovunque:
*   Qualsiasi hosting web classico (cPanel, Apache/Nginx).
*   Vercel, Netlify, Cloudflare Pages (Gratuiti e veloci).
*   GitHub Pages.
*   Attualmente: Ospitato sul vostro Hosting (neunoi.it).

---

## 3. Analisi delle Opzioni Disponibili

### Opzione A: Railway (Stato Attuale)
*   **Pro**: Facilissimo deployment (Git Push), HTTPS automatico, gestione segreti integrata.
*   **Contro**:
    *   **Costo**: Il piano Base costa ~$5/mese dopo il trial. Il trial scade.
    *   **Limitazioni Email**: Blocca le porte SMTP in uscita (25, 465, 587) per prevenire spam sugli account base. Richiede sblocco manuale via ticket o passaggio a piano Pro verificato.
    *   **Persistenza Dati**: SQLite richiede un Volume dedicato (costo aggiuntivo o configurazione) oppure migrazione a un vero database PostgreSQL (servizio gestito a parte).

### Opzione B: Hosting Proprietario (neunoi.it) con supporto Node.js
Se il vostro hosting attuale (es. cPanel/Plesk) supporta **Node.js**:
*   **Pro**: Già pagato/incluso, nessun blocco SMTP (essendo la stessa rete della mail), dati persistentemente salvi sul disco.
*   **Contro**: Configurazione più "manuale" (upload via FTP o Git manuale), gestione aggiornamenti meno automatica rispetto a Railway. Spazio disco limitato (ma SQLite occupa poco).
*   **Verifica Necessaria**: Chiedere al provider se supporta "Node.js App" o "Phusion Passenger".

### Opzione C: Google Cloud Platform (GCP) per Non-Profit
Avendo un account Google Workspace for Nonprofits, potreste avere accesso a crediti gratuiti su GCP ($2000/anno o più).
*   **Google Cloud Run**: Eccellente per Node.js. Scala a zero (costo quasi nullo se non usata).
    *   Richiede Docker (possiamo configurarlo).
    *   Richiede Cloud SQL (PostgreSQL gestito) o un volume persistente per SQLite (più complesso su Cloud Run).
    *   **Email**: GCP blocca la porta 25 ma **permette** la 587/465 verso Google Workspace SMTP (relay). È la soluzione "Enterprise" ma richiede più setup iniziale.

---

## 4. Problema Specifico Email (Blocco SMTP)

Il problema attuale non è il codice, ma l'infrastruttura di rete.
Le piattaforme Cloud (AWS, GCP, Railway, Azure) bloccano di default il traffico SMTP in uscita per evitare che i server vengano usati per spam.

**Soluzioni Tecniche:**
1.  **API Email (Consigliata)**: Usare servizi come **Resend**, **SendGrid** o **Mailgun** che inviano via HTTP (porta 443, sempre aperta) invece di SMTP. Hanno piani gratuiti generosi (es. Resend 3000 mail/mese gratis).
2.  **Sblocco IP**: Chiedere al supporto di Railway/GCP di sbloccare le porte (spesso richiedono carta di credito).
3.  **Relay SMTP su porta non standard**: Alcuni servizi offrono porte alternative (2525), ma spesso sono bloccate anch'esse.

---

## 5. Raccomandazione per il Team Tecnico

Per un'associazione, la soluzione ottimale bilancia **costo zero** e **bassa manutenzione**.

1.  **Database**: Migrare da SQLite a **PostgreSQL** su un piano gratuito (es. Supabase o Neon.tech, o incluso in Railway) per evitare la perdita dati ai deploy.
2.  **Hosting Backend**:
    *   Se l'hosting `neunoi.it` supporta Node.js -> **Spostare lì**. Risolve persistenza e email in un colpo solo.
    *   Se no -> Rimanere su **Railway** (o passare a **Render.com** che ha un piano free), ma configurare PostgreSQL esterno.
3.  **Email**: Abbandonare SMTP diretto. Passare a **Resend (API)** o Google Workspace API (più complesso). Resend è implementabile in 10 minuti di codice e funziona ovunque senza blocchi.

---

### Riepilogo Tecnico per i Developer
| Caratteristica | Requisito Minimo |
| :--- | :--- |
| **Runtime** | Node.js v18+ |
| **Porte in Uscita** | Aperta 443 (HTTPS) per API esterne. Porte 587/465 (SMTP) opzionali se si usa API mail. |
| **Porte in Entrata** | Una porta HTTP (es. 3000 o 8080) esposta pubblicamente. |
| **Persistenza** | Directory `/server/database.sqlite` e `/server/uploads` deve essere SCRIVIBILE e PERSISTENTE. In ambienti effimeri (Docker/Cloud), usare Volume Mount o Database Esterno. |
| **Variabili D'Ambiente** | Supporto per `.env` o gestione Secrets (per API Key, DB URL, JWT Secret). |
