import React from 'react';
import { MessageCircle } from 'lucide-react';

interface CommentCountButtonProps {
  postId: number;
  initialCount: number;
  // Prop para manejar el click (abrir el modal) si se usa como trigger
  onOpenModal: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const CommentCountButton: React.FC<CommentCountButtonProps> = ({ 
  initialCount, 
  onOpenModal 
}) => {
  // Aseguramos que la cuenta sea un número no negativo
  const count = Math.max(0, initialCount ?? 0);

  return (
    <div 
      className="flex items-center Dark-texto-blanco text-gray-500 hover:text-blue-500 transition-colors cursor-pointer"
      onClick={onOpenModal} // Llamamos a la función de apertura del modal
      role="button"
      aria-label={`Comentarios: ${count}`}
    >
      <MessageCircle className="h-5 w-5 mr-2 dark:hover:text-sky-400 hover:scale-110 transition-transform" />
      <span className="text-sm  select-none">{count}</span>
    </div>
  );
};

export default CommentCountButton;