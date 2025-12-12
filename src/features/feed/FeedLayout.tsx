import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  LogOut,
  Settings,
  Menu,
  X,
  Home,
  Trash,
  Contact,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Avatar from "../user-profile/components/Avatar.tsx";
import SearchUsers from "./components/SearchUsers";
import { Card } from "@/components/ui/card";
import { useAuth, User } from "../auth/services/AuthContext.tsx";
import NotificationsButton from "./components/NotificationsButton.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AccountSettingsModal from "../auth/components/AccountSettingsModal.tsx";
import DmDropdown from "../feed/chat/components/DmDropdown.tsx";
import { getChatSocket } from "../feed/chat/components/ChatSocket.ts"; 
import DeleteAccountModal from "./components/DeleteAccountModal.tsx";


const FeedLayout: React.FC = () => {
  const { user, isLoading, logout, getToken } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false); // <- nuevo
  const navigate = useNavigate();

  // Estado para el modal de "Datos de la cuenta"
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ... (socket useEffect igual que antes) ...
  useEffect(() => {
    if (!user) return;

    const token = getToken?.();
    const s = getChatSocket(token);

    const joinUserRoom = () => {
      try {
        if (user && user.id) s.emit("joinUser", { userId: Number(user.id) });
      } catch {}
    };

    s.on("connect", joinUserRoom);
    if (s.connected) joinUserRoom();

    const convHandler = (payload: any) => {
      try {
        window.dispatchEvent(new CustomEvent("chat:conversationUpdated", { detail: payload }));
      } catch {}
    };

    s.on("conversationUpdated", convHandler);

    return () => {
      try {
        s.off("conversationUpdated", convHandler);
        s.off("connect", joinUserRoom);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const handleViewProfile = () => {
    setMobileOpen(false);
    navigate("profile/:apodo".replace(":apodo", user?.apodo || ""));
  };

  const handleHome = () => {
    setMobileOpen(false);
    navigate("/feed");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-xl font-bold text-indigo-600">
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getAvatarUrl = (u: User | null): string | null => {
    if (!u) return null;
    return u.avatar ?? u.url ?? null;
  };

  const avatarUrl = getAvatarUrl(user);
  const fallbackInitial = user?.apodo?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <AccountSettingsModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
      />

      <DeleteAccountModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
      />

      <div className="flex justify-center h-screen overflow-hidden bg-slate-300">
        <div className="grid w-full xl:max-w-7xl lg:max-w-5xl md:max-w-3xl rounded-4xl mx-auto grid-cols-1 lg:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr_300px] h-full">
          <header className="col-span-full sticky top-0 h-16 bg-white border-b border-gray-200 p-4 z-10 flex justify-between items-center bg-linear-to-br from-[#faea3d]/80 to-[#d0522f]/80">
            <div className="flex items-center">
              <button
                aria-label="Abrir menú"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden mr-3 p-2 rounded-md hover:bg-gray-100"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center p-0 m-0">
                <img
                  src="/img/Logo_fenix_5.png"
                  alt="Imagen del feed"
                  className="w-10 h-10 ml-2 mr-2 min-[375px]:ml-0 min-[375px]:mr-0 "
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsButton />
              <div className="flex-1">
                <SearchUsers />
              </div>
            </div>
          </header>

          {/* Panel móvil: overlay */}
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${ mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none" }`}
            aria-hidden={!mobileOpen}
            onClick={() => {
              // Si hay un dropdown activo, no cerramos el menú aún
              if (dropdownActive) return;
              setMobileOpen(false);
            }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Aside lateral (menú) */}
          <aside className={`fixed inset-y-0 left-0 w-72 bg-white z-50 p-4 overflow-y-auto transform transition-transform duration-300 ease-in-out ${ mobileOpen ? "translate-x-0" : "-translate-x-full" }`} aria-hidden={!mobileOpen}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">Menú</div>
              <button aria-label="Cerrar" onClick={() => setMobileOpen(false)} className="p-2 rounded hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Card className="mb-6 p-4 shadow-sm border-gray-100">
              <div className="flex items-center space-x-3">
                <Avatar src={avatarUrl} alt={user.nombre || user.apodo} size={40} className="shrink-0 rounded-full" initials={fallbackInitial} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.nombre}</p>
                  <p className="text-sm text-gray-500 truncate">@{user.apodo}</p>
                </div>
              </div>
              <Button variant="link" onClick={handleViewProfile} className="mt-2 p-0 h-auto font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">Ver Perfil</Button>
            </Card>

            <Button variant="outline" className="w-full justify-start mt-4 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={handleHome}>
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Button>

            <div className="w-full mt-4">
              {/*
                Pasamos onOpenChange y onSelectConversation a DmDropdown
                para que notifique al layout si el dropdown está abierto o
                si el usuario ha elegido una conversación.
              */}
              <DmDropdown
                onOpenChange={(open: boolean) => setDropdownActive(open)}
                onSelectConversation={() => {
                  // Cuando selecciona una conversación, cerramos el menú móvil
                  setMobileOpen(false);
                }}
              />
            </div>

            <div className="mt-4">
              {/* Mobile settings dropdown: controlamos su estado con onOpenChange y evitamos
                  que los clicks en trigger/content lleguen al overlay con stopPropagation */}
              <DropdownMenu onOpenChange={(open) => setDropdownActive(open)}>
   
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      // Evitamos que el click del trigger burbuje al overlay que cierra el menú
                      e.stopPropagation();
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </Button>
                </DropdownMenuTrigger>


                <DropdownMenuContent
                  className="w-64"
                  onPointerEnter={() => setDropdownActive(true)}
                  onPointerLeave={() => setDropdownActive(false)}
                  onClick={(e) => e.stopPropagation()} // que los clicks dentro del content no cierren el overlay
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      setIsAccountModalOpen(true);
                      setMobileOpen(false); // cerramos menú solo cuando el usuario elige la opción
                    }}
                  >
                    Datos de la cuenta
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setMobileOpen(false);
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar cuenta
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-slate-400/50" />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>

          {/* El resto del layout queda igual */}
          <aside className="hidden lg:block bg-white border-r border-gray-200 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            {/* ... (contenido de sidebar grande) */}
            <Card className="mb-6 p-4 shadow-sm border-gray-100">
              <div className="flex items-center space-x-3">
                <Avatar src={avatarUrl} alt={user.nombre || user.apodo} size={40} className="shrink-0 rounded-full" initials={fallbackInitial} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.nombre}</p>
                  <p className="text-sm text-gray-500 truncate">@{user.apodo}</p>
                </div>
              </div>
              <Button variant="link" onClick={handleViewProfile} className="mt-2 p-0 h-auto font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">Ver Perfil</Button>
            </Card>

            <Button variant="outline" className="w-full justify-start mt-4 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={handleHome}>
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Button>

            <div className="xl:hidden lg:block min-[1280px]:hidden w-full mt-4">
              <DmDropdown/>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-4 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-59">
                 <DropdownMenuItem className="cursor-pointer" onClick={() => setIsAccountModalOpen(true)}> <Contact className="mr-2 h-4 w-4" /> Datos de la cuenta</DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => setIsDeleteModalOpen(true)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar cuenta
                  </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-400/50" />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </aside>

          <main className="flex flex-col bg-linear-to-tr from-[#faea3d]/80 to-[#d0522f]/80 border-x border-gray-200 col-span-1 lg:col-span-1 lg:col-start-2 xl:col-span-1">
            <div className="flex-1 flex justify-center overflow-y-auto" style={{ minHeight: "calc(100vh - 4rem)", maxHeight: "calc(100vh - 4rem)" }}>
              <div className="w-full max-w-2xl px-4 py-6">
                <Outlet />
              </div>
            </div>
          </main>

          <aside className="hidden min-[1247px]:block bg-white border-l border-gray-200 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Mensajes Directos</h3>

            <DmDropdown/>
          </aside>
        </div>
      </div>
    </>
  );
};

export default FeedLayout;