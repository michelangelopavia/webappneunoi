# Progetto neu [nòi] - Context per IA e Sviluppo

Questo documento riassume le logiche di business fondamentali e le convenzioni del progetto neu [nòi]. È pensato per essere fornito a un'IA o a un nuovo sviluppatore come "memoria storica" del progetto.

## Visione del Progetto
neu [nòi] è uno spazio di coworking e un'associazione che utilizza una moneta complementare chiamata **NEU** per valorizzare il tempo dei soci e facilitare lo scambio di servizi. Il sistema è progettato per funzionare in **perpetuo**, gestendo automaticamente i cicli annuali senza bisogno di interventi manuali sul codice.

## Regole d'Oro della Moneta NEU
1.  **Guadagno (Emissione)**:
    *   **Turni Host**: 1 ora = 2.5 NEU (Standard 9:00-18:30 feriali), 4 NEU (Serale 18:30-20:30), 6 NEU (Notturno/Festivo).
    *   **Volontariato**: Azioni specifiche con valore predefinito o ore "legacy" (rapporto 1:1 per il mantenimento della quota).
    *   **Task**: Compiti specifici assegnati dagli admin con premi in NEU.
2.  **Scadenza (Ciclica e Perpetua)**:
    *   I NEU hanno cicli di validità basati sull'anno associativo (1 Ottobre - 30 Settembre).
    *   **Regola Dinamica**: I NEU guadagnati in un qualsiasi Anno Associativo (N/N+1) scadono sempre il **31 Dicembre dell'anno N+1**.
    *   Esempio: Guadagnati a Febbraio 2025 (Anno 24/25) -> Scadono 31 Dic 2025. Guadagnati a Nov 2025 (Anno 25/26) -> Scadono 31 Dic 2026.
3.  **Sottrazione Automatica**:
    *   Il sistema ricalcola il saldo "al volo" filtrando i NEU scaduti in base alla data attuale. Non c'è bisogno di un'operazione manuale di azzeramento.
4.  **Utilizzo (Spesa)**:
    *   La spesa segue la logica **FIFO**: vengono consumati prima i NEU più vicchi (quelli con scadenza più prossima).

## Logiche del Ciclo Annuale
*   **Azzeramento Ore Volontariato**: Ogni 1° Ottobre, il contatore delle "Ore Anno" visualizzato nel profilo si resetta automaticamente a 0, poiché il sistema inizia a contare solo le dichiarazioni del nuovo anno associativo. I vecchi dati rimangono nel database come archivio storico.
*   **Riepiloghi**: Le pagine di statistica aggiungono automaticamente i nuovi anni solari e associativi ai menu a tendina man mano che il tempo passa.

## Logiche del Coworking
*   **Check-in**: Gli utenti registrano l'ingresso. Il sistema scala automaticamente gli ingressi dai carnet o verifica l'abbonamento attivo.
*   **Prenotazione Sale**: Esistono due tariffe basate sull'uso:
    *   `call`: Uso singolo (costo 0.5x).
    *   `riunione`: Uso collettivo (costo 1x).
    *   Il sistema permette un'eccedenza di massimo 2 ore di credito oltre l'abbonamento, che verranno poi fatturate a parte.

## Gestione Dati e Privacy
*   Il sistema distingue tra `User` (credenziali login) e `ProfiloSocio` / `ProfiloCoworker` (dati anagrafici e fiscali).
*   È fondamentale gestire i `Sconosciuto` o record duplicati durante le importazioni di massa (CSV). Nelle statistiche annuali, i record senza un ID utente mittente valido sono spesso duplicati di importazione da scartare.

## Convenzioni Tecniche
*   **Date**: Tutte le date sono salvate in formato ISO8601 UTC nel database, ma interpretate localmente per le statistiche (Fuso orario Italia).
*   **Numerazione**: Le ricevute degli ordini hanno una numerazione sequenziale che ricomincia ogni anno solare.
*   **Database**: SQLite è la sorgente della verità. La sincronizzazione con calendari esterni (come Google) è considerata opzionale e deve essere disabilitabile senza rompere il sistema.
