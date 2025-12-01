import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/features/auth/services/AuthContext";
import axios from "axios";
import Avatar from "@/features/user-profile/components/Avatar.tsx";
import ChatModal from "./ChatModal";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getChatSocket } from "./ChatSocket"; 

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type MinimalUser = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
};

type Conversation = {
  user: MinimalUser;
  unreadCount: number;
  lastMessage?: string | null;
  lastAt?: string | null;
};

export default function DmDropdown() {
  const { user, getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [openChat, setOpenChat] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = getToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get<Conversation[]>(
        `${API_BASE_URL.replace(/\/+$/, "")}/chat/conversations`,
        { headers }
      );
      setConversations(res.data ?? []);
    } catch (err) {
      console.warn("Error loading conversations:", err);
      setConversations([]); 
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    fetchConversations();
    // Configuramos el socket para escuchar actualizaciones de conversación
    const token = getToken?.();
    const s = getChatSocket(token);

    const onConversationUpdated = (payload: any) => {
      // La carga útil debe contener otherId/lastMessage/lastAt
      // Actualizamos la lista de conversaciones (simple y robusta)
      fetchConversations();
    };

    // Nos seguramos de que los usuarios se unen a la sala
    const joinUserRoom = () => {
      try {
        if (user && user.id) s.emit("joinUser", { userId: user.id });
      } catch {}
    };

    s.on("connect", joinUserRoom);
    if (s.connected) joinUserRoom();

    s.on("conversationUpdated", onConversationUpdated);

    //También escucha el evento de ventana de ChatModal
    const winHandler = () => fetchConversations();
    window.addEventListener("chat:conversationUpdated", winHandler as any);

    return () => {
      try {
        s.off("conversationUpdated", onConversationUpdated);
        s.off("connect", joinUserRoom);
      } catch {}
      window.removeEventListener("chat:conversationUpdated", winHandler as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, fetchConversations, getToken]);

  const unreadSenders = conversations.filter((c) => c.unreadCount > 0).length;

  const handleOpenChat = (c: Conversation) => {
    setSelected(c);
    setOpenChat(true);
  };

  const safeAlt = (u?: MinimalUser | null): string | undefined => {
    const value = u?.nombre ?? u?.apodo;
    return value ?? undefined;
  };

  const safeInitial = (u?: MinimalUser | null): string => {
    const value = u?.nombre ?? u?.apodo ?? "U";
    return String(value)[0]?.toUpperCase() ?? "U";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="relative w-full cursor-pointer active:shadow-inner active:opacity-90 transition-colors transform duration-300 justify-start inline-flex items-center font-bold bg-linear-to-bl from-[#ce016e] via-[#e63f58] to-[#e37d01] text-white"
          >
            Mensajes
            {unreadSenders > 0 && (
              <Badge className="absolute top-0 right-0 h-5 w-5 rounded-full p-0 flex items-center justify-center translate-x-1 -translate-y-1 bg-green-700">
                {unreadSenders}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80">
          <div className="p-3 border-b">
            <div className="font-semibold">Mensajes</div>
            <div className="text-xs text-gray-500">Conversaciones recientes</div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">Cargando...</div>
            ) : conversations.length === 0 ? (
              <DropdownMenuItem className="text-sm text-gray-500" asChild>
                <div>No hay conversaciones</div>
              </DropdownMenuItem>
            ) : (
              conversations.map((c) => (
                <DropdownMenuItem
                  key={c.user.id}
                  onSelect={() => handleOpenChat(c)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0 cursor-pointer"
                >
                  <div className="w-10 h-10 shrink-0">
                    <Avatar
                      src={c.user.avatar ?? undefined}
                      alt={safeAlt(c.user)}
                      size={40}
                      initials={safeInitial(c.user)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.user.nombre ?? c.user.apodo}</div>
                    <div className="text-xs text-gray-500">
                      {c.unreadCount} {c.unreadCount === 1 ? "mensaje nuevo" : "mensajes nuevos"}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>

      {selected && (
        <ChatModal
          otherUser={selected.user}
          open={openChat}
          onOpenChange={(v) => {
            setOpenChat(v);
            if (!v) setSelected(null);
          }}
        />
      )}
    </>
  );
}