// import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const LANGS = [
  { 
    code: "es", 
    labelKey: "lang.es", 
    // Usamos el código de país en minúsculas para la URL
    flagUrl: "https://flagcdn.com/es.svg" 
  },
  { 
    code: "en", 
    labelKey: "lang.en", 
    flagUrl: "https://flagcdn.com/us.svg" 
  },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const current = (() => {
    const lng = i18n.language ?? "es";
    return lng.startsWith("en") ? "en" : "es";
  })();

  const onChange = async (value: string) => {
    if (value === i18n.language) return;
    await i18n.changeLanguage(value);
    document.documentElement.lang = value;
    try {
      localStorage.setItem("lang", value);
    } catch {
      /* ignore */
    }
  };

 return (
    <div>
      <Select value={current} onValueChange={onChange}>
        {/* 1. Aplicamos text-white aquí para cuando el selector esté cerrado */}
        <SelectTrigger className="w-44 text-white shadow-sm border-white/20 bg-transparent">
          <SelectValue placeholder={t("lang.select.aria")} />
        </SelectTrigger>

        {/* 2. Aplicamos text-black (o el color que prefieras) al contenido desplegado */}
        <SelectContent className="text-black bg-white">
          {LANGS.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              <div className="flex items-center">
                <img 
                  src={l.flagUrl} 
                  alt="" 
                  className="mr-3 w-5 h-3.5 object-cover rounded-sm shadow-sm" 
                />
                {/* Eliminamos text-white de aquí para que herede del padre */}
                <span>{t(l.labelKey)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}