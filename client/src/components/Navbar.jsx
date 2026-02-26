import React, { useContext, useState } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { appContext } from "../context/appContext";
import axios from "axios";
import { toast } from "react-toastify";

/**
 * @component
 * COMPONENTE: NAVBAR
 * Barra di navigazione superiore presente su tutte le pagine (o quasi).
 * Gestisce la navigazione, il logout, e mostra lo stato dell'utente (Avatar, Nome).
 * @returns {JSX.Element} L'elemento Navbar.
 */
const Navbar = () => {
  const navigate = useNavigate();
  // Accesso allo stato globale (utente loggato, dati utente, funzioni di logout)
  const { userData, backendUrl, setIsLoggedin, setUserdata, getUserData } = useContext(appContext);

  // Stato per gestire il caricamento durante l'invio dell'email di verifica
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * @desc    Invia un'email contenente il codice OTP per la verifica dell'account.
   *          Previene l'invio multiplo gestendo lo stato `isSubmitting`.
   *          In caso di successo, reindirizza l'utente alla pagina `/email-verify`.
   * @async
   * @function sendVerificationOtp
   * @returns {Promise<void>}
   */
  const sendVerificationOtp = async () => {
    if (isSubmitting) return; // Evita click multipli

    try {
      setIsSubmitting(true);
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(
        backendUrl + "/api/auth/send-verify-otp"
      );

      if (data.success) {
        // Se l'email è partita, reindirizza alla pagina per inserire il codice OTP
        navigate("/email-verify");
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * @desc    Esegue il processo di logout.
   *          Se la sessione corrente appartiene a un profilo bambino (`isChildActive`), esegue
   *          un logout "parziale", riportando l'interfaccia allo stato del genitore senza eseguire
   *          il logout globale dall'applicazione.
   *          Se l'utente è un genitore o un terapista, esegue il logout completo ripulendo il cookie
   *          e reindirizzando alla home page.
   * @async
   * @function logout
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;

      // Se l'utente è in "Modalità Bambino" (profilo figlio attivo)
      if (userData && userData.isChildActive) {
        // Logout "parziale": torna al profilo genitore
        await axios.post(backendUrl + "/api/user/logout-child");
        await getUserData(); // Aggiorna i dati per riflettere il ritorno al genitore
        navigate("/profile");
        return;
      }

      // Logout completo (Utente Adulto)
      const { data } = await axios.post(backendUrl + "/api/auth/logout");

      if (data.success) {
        setIsLoggedin(false);
        setUserdata(false);
        navigate("/");
        toast.info("Logout effettuato");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 max-h-20 bg-gradient-to-r from-pink-300 to-purple-400">
      {/* LOGO E LINK DI NAVIGAZIONE */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <span className="text-3xl">🌈</span>
          <span className="text-white text-xl sm:text-2xl font-black tracking-tight">
            STORIE AMICHE
          </span>
        </div>
        {userData && (
          <ul className="flex gap-4 sm:gap-6">
            {!userData.isChildActive ? (
              // MENU GENITORE / TERAPEUTA
              <>
                <li onClick={() => navigate('/newStory')} className="hover:text-gray-700 cursor-pointer font-medium">Nuova Storia</li>
                <li onClick={() => navigate('/profile')} className="hover:text-gray-700 cursor-pointer font-medium">Profilo</li>
                <li onClick={() => navigate('/')} className="hover:text-gray-700 cursor-pointer font-medium">Home</li>

                {/* Link Area Bambini (solo se non è terapeuta, che non gestisce figli propri direttamente) */}
                {userData.tipo_utente !== 'terapeuta' && (
                  <li onClick={() => navigate('/child-select')} className="hover:text-gray-700 cursor-pointer font-medium bg-green-200 px-3 py-1 rounded-full">👶 Area Bambini</li>
                )}
              </>
            ) : (
              // MENU BAMBINO (Modalità Semplificata)
              <li onClick={() => navigate('/child-dashboard')} className="hover:text-gray-700 cursor-pointer font-black text-lg bg-white/60 px-6 py-2 rounded-full border-2 border-white shadow-sm transition-all hover:scale-105">🏠 La mia Bacheca</li>
            )}
          </ul>
        )}
      </div>

      {/* ZONA UTENTE (Avatar e Dropdown) */}
      {userData ? (
        <div className={`flex justify-center items-center text-white cursor-pointer font-black rounded-full relative group shadow-lg transition-all hover:scale-110 ${userData.isChildActive ? 'w-14 h-14 text-2xl bg-orange-500 border-4 border-white' : 'w-10 h-10 text-xl bg-purple-900'}`}>
          {/* Iniziale Utente */}
          {userData.name?.[0]?.toUpperCase() || 'U'}

          {/* MENU A TENDINA (Hover) */}
          <div className={`absolute hidden group-hover:block top-0 right-0 z-10 pt-10 ${userData.isChildActive ? 'w-56' : 'w-32'}`}>
            <ul className={`list-none p-2 m-0 bg-gradient-to-tr from-purple-400 to-red-600 text-white font-black rounded-xl shadow-2xl border-2 border-white/20 ${userData.isChildActive ? 'text-lg' : 'text-sm'}`}>

              {/* Opzione Verifica Email (se non verificata) */}
              {!userData.isAccountVerified && (
                <li
                  onClick={sendVerificationOtp}
                  className={`py-2 px-3 hover:bg-pink-200 hover:text-black cursor-pointer text-center rounded-lg mb-1 transition-all ${isSubmitting ? "opacity-50 cursor-wait" : ""
                    }`}
                >
                  {isSubmitting ? "Sending..." : "Verify Email"}
                </li>
              )}

              {/* Opzione Logout */}
              <li
                onClick={logout}
                className="py-2 px-3 hover:bg-pink-200 hover:text-black cursor-pointer rounded-lg text-center transition-all"
              >
                {/* Testo diverso a seconda se stiamo uscendo dal profilo bambino o dall'app */}
                {userData && userData.isChildActive ? 'Torna al Genitore' : 'Logout'}
              </li>
            </ul>
          </div>
        </div>
      ) : (
        // PULSANTE LOGIN (Se non loggato)
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 border bg-gradient-to-r from-pink-200 to-pink-400 border-gray-600 rounded-full px-6 py-2 hover:scale-105 transition-all shadow-sm text-gray-800 font-medium"
        >
          Login <img src={assets.arrow_icon} alt="" className="w-3" />
        </button>
      )}
    </div>
  );
};

export default Navbar;