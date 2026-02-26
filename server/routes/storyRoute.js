import express from 'express';
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
import { userAuth } from '../middleware/userAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';

const storyRouter = express.Router();

// ========================================
// ROTTE SPECIFICHE (con path fissi)
// DEVONO VENIRE PRIMA DI /:id
// ========================================

storyRouter.post('/create', userAuth, upload.any(), createStory);
storyRouter.get('/all', getAllStories);
storyRouter.get('/my-stories', userAuth, getUserStories);
storyRouter.post('/generate-audio', userAuth, generateAudio);

// ← QUESTE ROTTE DEVONO STARE QUI, PRIMA DI /:id
storyRouter.get('/child-stories', getChildStories);
storyRouter.get('/public-stories', getPublicStories);

storyRouter.put('/toggle-visibility', userAuth, toggleVisibility);
storyRouter.post('/assign-to-children', userAuth, assignStoryToChildren);

// ========================================
// ROTTE CON PARAMETRI (update, delete)
// ========================================

storyRouter.put('/update/:id', userAuth, upload.any(), updateStory);
storyRouter.delete('/delete/:id', userAuth, deleteStory);

// ========================================
// ROTTA DINAMICA /:id
// DEVE ESSERE ASSOLUTAMENTE L'ULTIMA!
// ========================================

storyRouter.get('/:id', getStoryById);

export default storyRouter;