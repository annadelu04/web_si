import express from 'express';
// Importiamo tutte le funzioni dal Controller( contiene la logica )
// Il controller è il "cervello": cche accede al Database. 
import {
    createStory,
    getAllStories,
    getUserStories,
    getStoryById,
    toggleVisibility,
    updateStory,
    deleteStory,
    assignStoryToChildren,
    getChildStories,
    getPublicStories,
    generateAudio
} from '../controller/storyController.js';

// Importiamo i Middleware.
import { userAuth } from '../middleware/userAuth.js';  // Controlla se l'utente è loggato 
import { upload } from '../middleware/uploadMiddleware.js';  //Gestisce il caricamento di file 

//Router gestisce tutte le chiamate che iniziano con "/api/story"
const storyRouter = express.Router();

// 1. ROTTE SPECIFICHE (PATH FISSI)
// Queste rotte devono essere definite PRIMA di quelle dinamiche (come /:id).
storyRouter.post('/create', userAuth, upload.any(), createStory);  // Crea una nuova storia.
storyRouter.get('/all', getAllStories);   // Ottiene tutte le storie 
// Ottiene solo le storie create dall'utente loggato (Genitore o Terapeuta).
storyRouter.get('/my-stories', userAuth, getUserStories);
storyRouter.post('/generate-audio', userAuth, generateAudio);  // Chiama l'IA (VibeVoice) per generare l'audio narrato.
storyRouter.get('/child-stories', getChildStories);  // storie assegnate a un bambino specifico.
storyRouter.get('/public-stories', getPublicStories); //tutte le storie segnate come "Pubbliche" 
storyRouter.put('/toggle-visibility', userAuth, toggleVisibility); // Cambia lo stato da Privata a Pubblica.
storyRouter.post('/assign-to-children', userAuth, assignStoryToChildren); // Assegna una storia specifica 


// 2. ROTTE CON PARAMETRI SPECIFICI (Azioni su un ID) agiscono su una storia specifica 
storyRouter.put('/update/:id', userAuth, upload.any(), updateStory); // Aggiorna una storia esistente.
storyRouter.delete('/delete/:id', userAuth, deleteStory);  // Elimina una storia dal database.

// 3. ROTTA DINAMICA GENERICA /:id (GET) Serve per leggere una singola storia
storyRouter.get('/:id', getStoryById);

export default storyRouter;