import React from 'react'
import Navbar from '../components/Navbar'
import Header from '../components/Header'

/**
 * @page
 * PAGINA: HOME
 * Questa è la pagina principale (Landing Page).
 * Renderizza la barra di navigazione (Navbar) e l'intestazione principale (Header),
 * che contiene a sua volta la lista/ricerca delle storie.
 * @returns {JSX.Element} Struttura della home page.
 */
const Home = () => {   //Arrow Function
  return (
    <div className="min-h-screen bg-gradient-to-r from-pink-100 to-purple-300">
      <Navbar /> {/* Menu di navigazione in alto */}
      <Header /> {/* Contenuto principale: Hero section + Lista Storie */}
    </div>
  )
}

export default Home
