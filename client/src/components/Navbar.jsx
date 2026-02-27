import React, { useContext, useState } from "react";  // useContext: Serve per leggere i dati globali (es."Chi è loggato?")
                                                      //useState: Serve per ricordare cose temporanee solo di questo componente
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom"; 
import { appContext } from "../context/appContext";
import axios from "axios";
import { toast } from "react-toastify";          //toast: Fa apparire le notifiche pop-up colorate 


 /* COMPONENTE: NAVBAR -- Barra di navigazione superiore presente su tutte le pagine (o quasi).
 Gestisce la navigazione, il logout, e mostra lo stato dell'utente (Avatar, Nome).
*/

const Navbar = () => {
  const navigate = useNavigate();
  // Accesso allo stato globale (utente loggato, dati utente, funzioni di logout)
  const { userData, backendUrl, setIsLoggedin, setUserdata, getUserData } = useContext(appContext);

  // Blocca i pulsanti mentre il sistema lavora per evitare click multipli.
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Invia un'email contenente il codice OTP per la verifica dell'account.
   In caso di successo, reindirizza l'utente alla pagina `/email-verify`.
   */
  const sendVerificationOtp = async () => {
    if (isSubmitting) return; // Evita click multipli

    try {
      setIsSubmitting(true);
      //Diciamo ad Axios di portarsi dietro i cookie di sessione. altrimenti il server non saprebbe chi sta chiedendo di verificare l'email.
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
      setIsSubmitting(false);  //sblocchiamo il pulsante
    }
  };

  //Esegue il processo di logout.
  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;

      // Se l'utente è in "Modalità Bambino" (profilo figlio attivo) esegue un logout "parziale"
      if (userData && userData.isChildActive) {
        // Logout "parziale": torna al profilo genitore
        await axios.post(backendUrl + "/api/user/logout-child");
        await getUserData(); // Aggiorna i dati per riflettere il ritorno al genitore
        navigate("/profile");
        return;
      }

      // Logout completo (Utente Adulto) -- ripulisce i cookie e reindirizza alla home page.
  
      const { data } = await axios.post(backendUrl + "/api/auth/logout");

      if (data.success) {
        setIsLoggedin(false);  //siamo ospiti
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
          onClick={() => navigate("/")}  //logo cliccabile e porta alla Home
          className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <span className="text-3xl">🌈</span>
          <span className="text-white text-xl sm:text-2xl font-black tracking-tight">
            STORIE AMICHE
          </span>
        </div>
        {userData && ( //Mostra il menu SOLO se l'utente è loggato
          <ul className="flex gap-4 sm:gap-6">

            {!userData.isChildActive ? (  
              // MENU GENITORE / TERAPEUTA
              <>
                <li onClick={() => navigate('/newStory')} className="hover:text-gray-700 cursor-pointer font-medium">Nuova Storia</li>
                <li onClick={() => navigate('/profile')} className="hover:text-gray-700 cursor-pointer font-medium">Profilo</li>
                <li onClick={() => navigate('/')} className="hover:text-gray-700 cursor-pointer font-medium">Home</li>

                {/* Link Area Bambini (Se sei un terapeuta, NON vedi "Area Bambini") */}
                {userData.tipo_utente !== 'terapeuta' && (
                  <li onClick={() => navigate('/child-select')} className="hover:text-gray-700 cursor-pointer font-medium bg-green-200 px-3 py-1 rounded-full">👶 Area Bambini</li>
                )}
              </>
            ) : (
              // MENU BAMBINO (Modalità Semplificata) -- link gigante alla sua bacheca
              <li onClick={() => navigate('/child-dashboard')} className="hover:text-gray-700 cursor-pointer font-black text-lg bg-white/60 px-6 py-2 rounded-full border-2 border-white shadow-sm transition-all hover:scale-105">🏠 La mia Bacheca</li>
            )}
          </ul>
        )}
      </div>

      {/* ZONA UTENTE -- Se l'utente è loggato, mostra l'avatar. Altrimenti mostra il bottone Login */}
      {userData ? (
        <div className={`flex justify-center items-center text-white cursor-pointer font-black rounded-full relative group shadow-lg transition-all hover:scale-110 ${userData.isChildActive ? 'w-14 h-14 text-2xl bg-orange-500 border-4 border-white' : 'w-10 h-10 text-xl bg-purple-900'}`}>
          {/* Iniziale Utente */}
          {userData.name?.[0]?.toUpperCase() || 'U'}

          {/* MENU A TENDINA (Hover) -- Se è bambino il cerchio dell'avatar è ARANCIONE*/}  
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
        
        // PULSANTE LOGIN (Se non sei loggato)
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