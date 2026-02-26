import express from "express";
import { userAuth } from "../middleware/userAuth.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
    getUserData,
    logoutChild,
    updateProfile,
    requestDeleteOtp,
    verifyDeleteAndDelete,
    addChild,
    getChildren,
    switchToChild,
    addTherapist,
    getTherapists,
    editChild,
    deleteChild,
    searchTherapists,
    removeConnection
} from "../controller/userController.js";


const userRouter = express.Router();
// Endpoint for get users data
userRouter.get('/data', userAuth, getUserData);
userRouter.put('/update', userAuth, updateProfile);
userRouter.post('/request-delete-otp', userAuth, requestDeleteOtp);
userRouter.post('/verify-delete', userAuth, verifyDeleteAndDelete);

// Child profiles routes
userRouter.post('/add-child', userAuth, upload.single('avatar'), addChild);
userRouter.get('/children', userAuth, getChildren);
userRouter.post('/switch-child/:childId', userAuth, switchToChild);
userRouter.post('/logout-child', logoutChild);
userRouter.put('/edit-child/:childId', userAuth, upload.single('avatar'), editChild);
userRouter.delete('/delete-child/:childId', userAuth, deleteChild);

// Therapist routes
userRouter.post('/add-therapist', userAuth, addTherapist);
userRouter.get('/therapists', userAuth, getTherapists);
userRouter.post('/search-therapists', userAuth, searchTherapists);
userRouter.post('/remove-connection', userAuth, removeConnection);

export default userRouter;
