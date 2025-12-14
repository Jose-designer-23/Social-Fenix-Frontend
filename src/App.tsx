import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FeedLayout from './features/feed/FeedLayout.tsx'; 
import FeedPage from './features/feed/pages/FeedPage.tsx'; 
import PostPage from './features/feed/pages/PostPage.tsx';
import CommentThreadPage from './features/feed/pages/CommentThreadPage.tsx'; 
import LoginPage from './features/auth/pages/LoginPage.tsx';
import RegisterPage from './features/auth/pages/RegisterPage.tsx';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage.tsx';
import ProfilePage from './features/user-profile/pages/ProfilePage.tsx';
import { AuthProvider } from './features/auth/services/AuthContext.tsx';
import { Toaster } from 'react-hot-toast';
import { NotificationsProvider } from './features/feed/components/NotificationsProvider.tsx';
// import Toggle from "./components/NightToggle.tsx";

import './App.css';

function App() {

  return (
    <AuthProvider>
      <NotificationsProvider>
      <Toaster />
      <BrowserRouter>
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Ruta de Módulo Protegido: El FeedLayout protege todas sus rutas hijas */}
                <Route path="/" element={<FeedLayout />}>
                    {/* Rutas que van DENTRO del FeedLayout */}
                    <Route index element={<FeedPage />} />
                    {/* Ruta para que "/feed" vaya al FeedPage */}
                    <Route path="feed" element={<FeedPage />} />
                    {/* Ruta para que el feed vaya a PostPage */}
                    <Route path="feed/post/:id" element={<PostPage />} />
                    {/* Ruta para el hilo/permalink de un comentario */}
                    <Route path="feed/post/:postId/comment/:commentId" element={<CommentThreadPage />} />
                    <Route path="profile/:apodo" element={<ProfilePage />} />
                </Route>
                
                <Route path="*" element={<h1>404: Página no encontrada</h1>} />
            </Routes>
        </BrowserRouter>
        </NotificationsProvider>
    </AuthProvider>
  )
}

export default App
