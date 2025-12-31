import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

// Componente para buscar publicaciones en el feed
const SearchPost: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { t } = useTranslation();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = (q ?? "").trim();
    if (!trimmed) return;
    const encoded = encodeURIComponent(trimmed);
    navigate(`/feed/search?q=${encoded}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 w-full max-w-lg"
      role="search"
      aria-label={t("SearchPost.aria")}
    >
      <div className="relative flex-1">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("SearchPost.placeholder")}
          aria-label={t("SearchPost.aria")}
          className="w-full pr-10 border-gray-400 dark:focus:border-amber-100"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </span>
      </div>
      <Button
        type="submit"
        className="whitespace-nowrap active:scale-95 active:shadow-inner active:opacity-90 transition transform duration-150 bg-gray-200 hover:bg-gray-300 cursor-pointer text-black Dark-boton Dark-texto-blanco Dark-outline"
      >
        {t("SearchPost.button")}
      </Button>
    </form>
  );
};

export default SearchPost;