///src/features/user-profile/components/Avatar.tsx

import React, { useEffect, useState } from "react";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  size?: number; // px
  className?: string;
  initials?: string; // texto de respaldo como "F"
  placeholder?: string; // URL de imagen de marcador de posición opcional
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "avatar",
  size = 40,
  className = "",
  initials = "U",
  placeholder,
}) => {
  const [errored, setErrored] = useState(false);

  // Restablecemos el estado de error cuando cambia el origen
  useEffect(() => {
    setErrored(false);
  }, [src]);

  const safeSrc = src && !errored ? src : placeholder ?? null;

  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-block relative overflow-hidden rounded-full ${className}`}
      aria-hidden={false}
      title={alt}
    >
      {safeSrc ? (
        <img
          src={safeSrc}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => {
            setErrored(true);
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#6366f1",
            color: "white",
            fontWeight: 700,
            fontSize: Math.max(12, size / 2.5),
          }}
        >
          {initials?.[0]?.toUpperCase() ?? "U"}
        </div>
      )}
    </div>
  );
};

export default Avatar;