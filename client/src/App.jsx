import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import EmailVerify from './pages/EmailVerify'
import ResetPassword from './pages/ResetPassword'
import NewStory from './pages/newStory'
import Profile from './pages/Profile'
import ViewStory from './pages/viewStory'
import { ToastContainer } from 'react-toastify';
import EditStory from './pages/EditStory';
import ChildProfileSelector from './components/ChildProfileSelector';
import SequencingGame from './components/games/SequencingGame';
import EmotionMatchingGame from './components/games/EmotionMatchingGame';
import ChildDashboard from './pages/ChildDashboard';

const App = () => {
  return (
    <div>
      <ToastContainer />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/newStory' element={<NewStory />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/email-verify' element={<EmailVerify />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/story/:id' element={<ViewStory />} />
        <Route path="/edit-story/:id" element={<EditStory />} />
        <Route path="/child-select" element={<ChildProfileSelector />} />
        <Route path="/games/sequencing/:storyId" element={<SequencingGame />} />
        <Route path="/games/emotions/:storyId" element={<EmotionMatchingGame />} />
        <Route path='/child-dashboard' element={<ChildDashboard />} />
      </Routes>
    </div>
  )
}

export default App
