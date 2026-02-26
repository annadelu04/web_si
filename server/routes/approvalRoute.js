import express from 'express';
import { userAuth } from '../middleware/userAuth.js';
import {
    getPendingStories,
    approveStory,
    rejectStory,
    getAssignedChildren,
    getPendingInvitations,
    respondToInvitation
} from '../controller/approvalController.js';

const approvalRouter = express.Router();

// Therapist approval routes
approvalRouter.get('/pending-stories', userAuth, getPendingStories);
approvalRouter.post('/approve/:storyId', userAuth, approveStory);
approvalRouter.post('/reject/:storyId', userAuth, rejectStory);
approvalRouter.get('/assigned-children', userAuth, getAssignedChildren);
approvalRouter.get('/invitations', userAuth, getPendingInvitations);
approvalRouter.post('/respond-invitation', userAuth, respondToInvitation);

export default approvalRouter;
