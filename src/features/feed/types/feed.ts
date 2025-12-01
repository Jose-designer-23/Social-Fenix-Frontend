//src/features/feed/types/feed.ts

// Definición de tipos basada en la respuesta final del backend
// Estas interfaces son comunes a PostCard, FeedPage y CommentModal.
export interface UserDetails {
    id: number;
    nombre: string;
    apodo: string;
    avatar?: string | null;
}

export interface BasePost {
    id: number;
    contenido: string;
    url_imagen: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
    apodo: UserDetails; // El autor original del post
    sortDate: string;  // Usado por el backend para ordenar
}

// El feed puede contener posts (type: 'post') o reposts (type: 'repost')
export interface FeedItem extends BasePost {
    type: 'post' | 'repost' | 'comment';
    isRepost?: boolean;
    repostedBy?: {
        id: number;
        apodo?: string | null; 
        nombre?: string | null;
    };
    repostDate?: string; // Fecha en que se hizo el repost 
    // Campos opcionales para sincronizar conteos y flags desde el backend
    likesCount?: number;
    liked?: boolean; // Si el usuario actual ya dio like
    repostsCount?: number;
    reposted?: boolean; // Si el usuario actual ya reposteo
    commentsCount?: number;
    originalPostId?: number | null; // El ID del post original
}

//  Interfaz para el contenido anidado dentro de un CommentItem o LikeItem
export interface CommentDetails {
    id: number;
    contenido: string;
    fecha_creacion: string;
    // postOriginal: PostDetails; // El post al que se respondió/dio like
}