// Tipo para un comentario recibido desde el backend.
// Se usa para PostPage y CommentItem.
export interface CommentFromApi {
  id: number;
  contenido: string;
  url_imagen?: string | null;
  fecha_creacion: string;
  autor: { id: number; apodo: string; nombre?: string; avatar?: string | null } | null;
  parentComment?: { id: number } | null;
  // Permitimos leer post.id en la página de hilo.
  post?: { id: number; contenido?: string; fecha_creacion?: string } | null;
  // Campo opcional para el árbol en frontend
  children?: CommentFromApi[];

   // Algunos endpoints (findOne) devuelven las respuestas en 'replies'
  replies?: CommentFromApi[];

  likesCount?: number; // número de likes del comentario
  liked?: boolean; 
  
   // Contador de respuestas directas a este comentario
  repliesCount?: number;
}