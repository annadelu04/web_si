//UseEffect effetti collaterali, useState variabili che se modificate aggiornano la grafica, Context per colleg. a dati globali
import React, { useEffect, useState, useContext } from "react"; 
import { assets } from "../assets/assets"; 
import { appContext } from "../context/appContext";  
import { useNavigate } from "react-router-dom";   //funzione hook per cambiare pagina
import axios from 'axios';   //libreria per inviare richieste al server e ricevere risposte

  //COMPONENTE: HEADER (Contenuto Principale Home)
const Header = () => {
  const navigate = useNavigate();     
  const { userData, backendUrl } = useContext(appContext);  
  // Usiamo useContext per collegarci all'appContext da cui estraiamo solo userData e backendUrl 

  // --- STATO DEL COMPONENTE ---
  const [userStories, setUserStories] = useState([]);       //Creiamo uno stato locale.
  // userStories:variabile che conterrà la lista delle storie. setUserStories: La funzione che useremo per aggiornare questa lista.
  const [currentPage, setCurrentPage] = useState(1);        // Pagina corrente. Inizia dalla pagina 1.
  const [searchTerm, setSearchTerm] = useState("");         // Testo cercato - Stato per la barra di ricerca.
  const [selectedCategory, setSelectedCategory] = useState("Tutte"); // Filtro categoria di default su "tutte"
  const STORIES_PER_PAGE = 16;

  useEffect(() => {                 //"Esegui questa funzione dopo che hai disegnato il componente".
    const fetchStories = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/story/all');    
        //Chiediamo ad Axios di fare una richiesta GET all'indirizzo. await blocca la funzione finché il server non risponde.

        if (data.success) {  
          // Assegnamo un colore pastello casuale (o sequenziale) a ogni storia per renderle vivaci
          const colors = ["bg-blue-200", "bg-green-200", "bg-yellow-200", "bg-purple-200"]; 
          const coloredStories = data.stories.map((story, index) => ({   //con map trasformo le storie 
            ...story,       //creo oggetto che contiene le info e i colori)
            color: colors[index % colors.length]  //% assegna i colori a rotazione 
          }));
          setUserStories(coloredStories);     //Salviamo le nuove storie "colorate" nello stato userStories
        }
      } catch (error) {
        console.error("❌ Error fetching stories:", error);
      }
    };

    fetchStories();  
  }, [backendUrl]);   //"Esegui questo effetto solo all'avvio, oppure se backendUrl dovesse cambiare".

  //Reimposta la paginazione alla prima pagina ogni volta che si cambia filtro.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);    //Esegui ogni volta che cambia la ricerca o la categoria selezionata

  /**Gestisce il click su una storia dalla griglia. Reindirizza alla vista storia se l'utente è loggato,
    altrimenti chiede il login conservando la rotta di destinazione. */
  const handleStoryClick = (storyId) => {
    if (userData) {                
      navigate(`/story/${storyId}`);
    } else {
      navigate('/login', { state: { from: `/story/${storyId}` } });
    }
  };

  // --- 2. LOGICA FILTRI (categorie uniche dalle storie scaricate) ---
  const categories = ["Tutte", ...new Set(userStories.map(s => s.category).filter(Boolean))];
 //Rimuove i duplicati automaticamete.Crea una lista di sole categorie

  //Passa in rassegna tutte le storie e tiene solo quelle con: titolo e categoria
  const filteredStories = userStories.filter(story => {     
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Tutte" || story.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- 3. LOGICA PAGINAZIONE (calcola quante pagine servono e l'indice di partenza) ---
  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);  
  const startIndex = (currentPage - 1) * STORIES_PER_PAGE;    
  //Taglia l'array delle storie filtrate prendendo solo la fetta dalla startIndex fino alla fine della pagina corrente              
  const displayedStories = filteredStories.slice(startIndex, startIndex + STORIES_PER_PAGE);
  
  
  /*centro testo e spaziantura*/
  return (
    <div className="w-full">
      <section className="text-center flex flex-col items-center w-full py-20 pb-10 px-4"> 
        {/* TITOLO E INTRO */}
        <h2 className="text-5xl font-black mb-4 text-gray-800 tracking-tight uppercase">
          Storie Sociali
        </h2>
        <p className="text-gray-500 mb-12 font-medium max-w-2xl">
          Cerca tra decine di storie pensate per aiutare i bambini nelle situazioni quotidiane,
          divise per tematiche terapeutiche.
        </p>

        {/* CONTAINER RICERCA E FILTRI */}
        <div className="w-full max-w-4xl mb-12 space-y-6">
          {/* Barra di Ricerca */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cerca per titolo..."
              className="w-full pl-16 pr-6 py-5 bg-white border-4 border-transparent focus:border-indigo-500 rounded-3xl shadow-2xl text-xl font-bold outline-none transition-all placeholder:text-gray-300"
              value={searchTerm}    //Il testo dentro l'input è controllato dallo stato searchTerm
              onChange={(e) => setSearchTerm(e.target.value)}   //Ogni volta che scrivi una lettera, scatta l'evento e,e aggiorniamo lo stato
            />
          </div>

          {/* Pillole Categorie */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (         //Per ogni categoria trovata crea un bottone.
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}       //Quando clicchi, imposta quella categoria come selectedCategory.
                className={`px-6 py-2 rounded-full font-black text-sm uppercase tracking-wider transition-all border-4 ${selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-110'
                  : 'bg-white text-gray-500 border-white hover:border-indigo-200 hover:text-indigo-500 shadow-md'
                  }`}   //: Se il bottone corrisponde alla categoria selezionata cambia da bianco a viola
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRIGLIA DELLE STORIE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-6 w-full max-w-7xl min-h-[400px]">
          {displayedStories.length > 0 ? (            //Se ci sono storie da mostrare disegna una card per ogni storia.
            displayedStories.map((story) => (
              <div
                key={story._id}
                onClick={() => handleStoryClick(story._id)}   
                //Applica come classe il colore che abbiamo calcolato all'inizio
                className={`${story.color} p-8 rounded-3xl shadow-xl hover:scale-105 hover:rotate-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center h-64 border-8 border-white group relative`}
              >
            

                {/* Icona Libro Fluttuante */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform border-4 border-indigo-100">
                  <span className="text-2xl">📖</span>
                </div>
                {/* Badge Categoria */}
                {story.category && (
                  <span className="absolute top-4 right-4 text-[10px] font-black bg-white/50 px-2 py-1 rounded-lg uppercase text-gray-600 border border-white/20">
                    {story.category}
                  </span>
                )}
                {/* Titolo e Descrizione */}
                <h3 className="text-xl font-black text-gray-800 mb-3 line-clamp-2 px-2 w-full uppercase tracking-tighter leading-tight">
                  {story.title}
                </h3>
                <p className="text-gray-700 font-medium line-clamp-3 text-sm italic leading-relaxed">
                  {story.description || (story.paragraphs?.[0]?.text || "Scopri questa storia...")}
                </p>
              </div>
            ))
          ) : (
            // Stato "Nessun Risultato"  --  mostra l'icona della lente e un bottone per resettare i filtri
            <div className="col-span-full py-20 flex flex-col items-center animate-fadeIn">
              <span className="text-6xl mb-4">🔍</span>
              <p className="text-gray-400 font-bold text-2xl">Nessuna storia trovata con questi filtri.</p>
              <button
                onClick={() => { setSearchTerm(""); setSelectedCategory("Tutte"); }}
                className="mt-6 text-indigo-600 font-black hover:underline underline-offset-4"
              >
                Resetta i filtri
              </button>
            </div>
          )}
        </div>

        {/* PAGINAZIONE */}
        {totalPages > 1 && (   //Mostra i controlli solo se c'è più di una pagina.
          <div className="flex items-center gap-6 mt-20">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 border-4 border-white ${currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-white text-gray-800 hover:bg-gray-800 hover:text-white transform hover:-translate-x-2'
                }`}
            >
              ←   
            </button>  

            <div className="flex items-center gap-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (  
              //Genera i numeri di paginae crea un bottone per ciascuno.
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl font-black transition-all border-2 ${currentPage === page
                    ? 'bg-gray-800 text-white border-gray-800 shadow-inner'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} //Aumenta la pagina di 1, ma mai oltre il massimo
              disabled={currentPage === totalPages}
              className={`px-8 py-3 rounded-full font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 border-4 border-white ${currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-white text-gray-800 hover:bg-gray-800 hover:text-white transform hover:translate-x-2'
                }`}
            >
              →
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Header;