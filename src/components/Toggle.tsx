import React from "react";

interface ToggleProps {
  checked?: boolean; // si se pasa, el componente es controlado
  defaultChecked?: boolean; // valor inicial si no es controlado
  onChange?: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function Toggle({
  checked,
  defaultChecked = false,
  onChange,
  id,
  disabled = false,
  className,
}: ToggleProps) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = React.useState<boolean>(defaultChecked);

  React.useEffect(() => {
    if (isControlled) setInternalChecked(Boolean(checked));
  }, [checked, isControlled]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (!isControlled) setInternalChecked(next);
    onChange?.(next);
  }

  const current = isControlled ? Boolean(checked) : internalChecked;

  return (
    <label className={`toggle ${className ?? ""}`} role="switch" aria-checked={current}>
      <input
        id={id}
        type="checkbox"
        checked={current}
        onChange={handleChange}
        disabled={disabled}
        aria-label={id ?? "toggle"}
      />
      <span className="toggle-slider" aria-hidden="true" />
    </label>
  );
}