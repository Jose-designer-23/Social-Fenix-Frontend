import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Avatar from "../../user-profile/components/Avatar";
import { Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type UserHit = {
  id: number;
  nombre?: string | null;
  apodo?: string;
  avatar?: string | null;
};

interface SearchUsersProps {
  className?: string;
  placeholder?: string;
  minLength?: number;
}

export default function SearchUsers({
  className = "",
  placeholder,
  minLength = 2,
}: SearchUsersProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const ph = placeholder ?? t("SearchUsers.placeholder");

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < (minLength ?? 2)) {
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await axios.get<UserHit[]>(
          `${API_BASE_URL}/user/search`,
          { params: { q: query } }
        );
        const data = res.data ?? [];
        setResults(data);
        setShowDropdown(true);
      } catch (err: any) {
        console.error("Search users error:", err);
        setError(t("SearchUsers.searchError"));
        setResults([]);
        setShowDropdown(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query, minLength, t]);

  const handleSelect = (apodo?: string) => {
    if (!apodo) return;
    setShowDropdown(false);
    setQuery("");
    navigate(`/profile/${apodo}`);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative ">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder={ph}
          className="w-full py-2 px-3 rounded-md Dark-texto-blanco Dark-input border max-w-xs md:w-48 max-[450px]:w-30 bg-white focus:outline-none"
          aria-label={t("SearchUsers.ariaLabel")}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-100"
          role="listbox"
        >
          <div className="max-h-[260px] overflow-y-auto">
            {error ? (
              <div className="p-3 text-sm text-red-600">{error}</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">{t("SearchUsers.noResults")}</div>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u.apodo)}
                  className="w-full Dark-boton text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                  role="option"
                >
                  <div className="w-9 h-9 shrink-0">
                    <Avatar
                      src={u.avatar ?? undefined}
                      alt={t("SearchUsers.userAvatarAlt", { name: u.nombre ?? u.apodo ?? t("SearchUsers.userFallback") })}
                      size={36}
                      initials={(u.nombre ?? u.apodo ?? "U")[0]?.toUpperCase() ?? "U"}
                    />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer">
                    <div className="font-medium text-sm truncate">{u.nombre ?? u.apodo}</div>
                    <div className="text-xs Dark-apodo text-gray-500 truncate">@{u.apodo}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          {results.length > 5 && (
            <div className="p-2 text-xs text-gray-500 text-center border-t">
              {t("SearchUsers.showingResults", { count: results.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}