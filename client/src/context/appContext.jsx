import axios from "axios";
import { createContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

// CREAZIONE CONTESTO GLOBALE
// Questo oggetto `appContext` sarà il "magazzino" dati accessibile da tutta l'app.
export const appContext = createContext();

//Provider del contesto dell'applicazione.Avvolge i componenti figli permettendo loro di consumare `appContext`.
export const AppContextProvider = (props) => {

  // 1. CONFIGURAZIONE AXIOS GLOBALE
  // Dice al browser: "Quando chiami il server ricordati di includere i COOKIE. Senza questo, il login non funziona.
  axios.defaults.withCredentials = true;
  // URL del Backend:
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  // Stato: L'utente è loggato?
  const [isLoggedin, setIsLoggedin] = useState(false);

  // Stato: Dati dell'utente (Nome, Email, Tipo, ecc.)
  // Usiamo null inizialmente per distinguere "caricamento" da "nessun dato"
  const [userData, setUserdata] = useState(null);

// 3. FUNZIONE: SCARICA I DATI DELL'UTENTE
// Chiamata quando sappiamo di essere loggati. Riempie `userData`.
  const getUserData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/data");

      if (data.success) {
        setUserdata(data.userData);
        console.log("✅ Dati utente caricati:", data.userData);  //salviamo i dati nello stato.
      } else {
        // Se il token è scaduto o non valido, resettiamo lo stato
        setUserdata(null);
      }
    } catch (error) {
      console.error("Errore recupero dati utente:", error.message);
    }
  };

// 4. FUNZIONE: CONTROLLO INIZIALE (AUTH CHECK) -- Questa è la prima funzione che parte.
  const getAuthState = async () => {
    try {
      // Chiediamo al backend: "Ho un cookie valido?"
      const { data } = await axios.get(backendUrl + "/api/auth/is-auth");

      if (data.success) {
        // SÌ: Setta lo stato a loggato e scarica i dettagli dell'utente.
        setIsLoggedin(true);
        getUserData();
      } else {
        // NO: Resettiamo tutto (utente ospite)
        setIsLoggedin(false);
        setUserdata(null);
      }
      // In caso di errore (es. server spento), consideriamo l'utente non loggato.
    } catch (error) {
      console.error("Check Auth fallito:", error.message);
      setIsLoggedin(false);
      setUserdata(null);
    }
  };
  // 5. EFFETTO DI AVVIO (ON MOUNT)
  // Eseguiamo il controllo solo 1 volta all'apertura dell'app
  useEffect(() => {
    getAuthState();
  }, []);

// 6. ESPOSIZIONE DEI DATI (VALUE)
  // Valori utilizzabili da qualsiasi componente
  const value = {
    backendUrl,
    isLoggedin,
    setIsLoggedin,
    userData,
    setUserdata,
    getUserData,
  };
// RENDER DEL PROVIDER -- Avvolge `props.children` (tutta l'app) fornendo loro l'accesso a `value`.
  return (
    <appContext.Provider value={value}>{props.children}</appContext.Provider>
  );
};