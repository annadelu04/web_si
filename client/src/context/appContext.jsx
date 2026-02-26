import axios from "axios";
import { createContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

/**
 * @context
 * Contesto globale per condividere lo stato di autenticazione e i dati utente
 * su tutto l'albero dei componenti dell'applicazione.
 */
export const appContext = createContext();

/**
 * @component
 * Provider del contesto dell'applicazione.
 * Avvolge i componenti figli permettendo loro di consumare `appContext`.
 * @param {Object} props - Proprietà passate al componente.
 * @param {React.ReactNode} props.children - I componenti figli reattivi racchiusi dal provider.
 */
export const AppContextProvider = (props) => {
  // 1. CONFIGURAZIONE AXIOS GLOBALE
  // Impostiamo `withCredentials = true` di default.
  // Questo è FONDAMENTALE perché permette al browser di inviare automaticamente
  // i cookie (che contengono il token JWT) ad ogni richiesta verso il backend.
  axios.defaults.withCredentials = true;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  // Stato: L'utente è loggato?
  const [isLoggedin, setIsLoggedin] = useState(false);

  // Stato: Dati dell'utente (Nome, Email, Tipo, ecc.)
  // Usiamo null inizialmente per distinguere "caricamento" da "nessun dato"
  const [userData, setUserdata] = useState(null);

  /**
   * @desc Verifica lo stato della validità di un account interrogando l'API
   *       di backend per far scattare un fetch sui dettagli (quali nome e tipo).
   *       Aggiorna conseguentemente lo stato locale `userData`. Resetta lo stato in caso di errore
   *       o se il token è scaduto.
   * @async
   * @function getUserData
   * @returns {Promise<void>}
   */
  const getUserData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/data");
      if (data.success) {
        setUserdata(data.userData);
        console.log("✅ Dati utente caricati:", data.userData);
      } else {
        // Se il token è scaduto o non valido, resettiamo lo stato
        setUserdata(null);
      }
    } catch (error) {
      console.error("Errore recupero dati utente:", error.message);
    }
  };

  /**
   * @desc   Prima operazione avviata dall'App: interroga il server per capire se
   *         (attraverso i cookie inviati automaticamente abilitati con withCredentials) l'utente
   *         esiste e ha una sessione valida.
   *         Imposta lo stato `isLoggedin` su `true` ed evoca `getUserData()` se la riposta del
   *         backend lo ammette; altrimenti funge da pulizia sessione.
   * @async
   * @function getAuthState
   * @returns {Promise<void>}
   */
  const getAuthState = async () => {
    try {
      // Chiediamo al backend: "Ho un cookie valido?"
      const { data } = await axios.get(backendUrl + "/api/auth/is-auth");

      if (data.success) {
        // SÌ: Impostiamo stato login e scarichiamo i dettagli utente
        setIsLoggedin(true);
        getUserData();
      } else {
        // NO: Resettiamo tutto (utente ospite)
        setIsLoggedin(false);
        setUserdata(null);
      }
    } catch (error) {
      console.error("Check Auth fallito:", error.message);
      setIsLoggedin(false);
      setUserdata(null);
    }
  };

  // Eseguiamo il controllo appena l'app viene montata
  useEffect(() => {
    getAuthState();
  }, []);

  // Valori esposti a tutti i componenti figli
  const value = {
    backendUrl,
    isLoggedin,
    setIsLoggedin,
    userData,
    setUserdata,
    getUserData,
  };

  return (
    <appContext.Provider value={value}>{props.children}</appContext.Provider>
  );
};