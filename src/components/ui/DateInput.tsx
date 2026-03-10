import React, { useState, useEffect, useRef } from "react";

interface DateInputProps {
    value?: string; // YYYY-MM-DD (controlled)
    onChange?: (isoDate: string) => void;
    className?: string;
    required?: boolean;
    placeholder?: string;
    name?: string; // For FormData support
}

/**
 * Input de data mascarado DD/MM/YYYY.
 * Recebe e emite valores no formato ISO (YYYY-MM-DD).
 * Exibe no formato brasileiro DD/MM/YYYY com máscara automática.
 * Suporta uso controlado (value+onChange) e não-controlado (name + FormData).
 */
export default function DateInput({ value, onChange, className = "", required, placeholder, name }: DateInputProps) {
    const [display, setDisplay] = useState("");
    const [isoValue, setIsoValue] = useState(value || "");

    // Sincroniza quando value externo muda (modo controlado)
    useEffect(() => {
        if (value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split("-");
            setDisplay(`${d}/${m}/${y}`);
            setIsoValue(value);
        } else if (value === "" || value === undefined) {
            if (value === "") {
                setDisplay("");
                setIsoValue("");
            }
        }
    }, [value]);

    const applyMask = (raw: string) => {
        let digits = raw.replace(/\D/g, "").slice(0, 8);
        let masked = "";
        for (let i = 0; i < digits.length; i++) {
            if (i === 2 || i === 4) masked += "/";
            masked += digits[i];
        }
        return masked;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = applyMask(e.target.value);
        setDisplay(masked);

        const digits = masked.replace(/\D/g, "");
        if (digits.length === 8) {
            const dd = digits.slice(0, 2);
            const mm = digits.slice(2, 4);
            const yyyy = digits.slice(4, 8);
            const iso = `${yyyy}-${mm}-${dd}`;
            setIsoValue(iso);
            onChange?.(iso);
        } else {
            setIsoValue("");
            if (digits.length === 0) onChange?.("");
        }
    };

    return (
        <>
            <input
                type="text"
                inputMode="numeric"
                placeholder={placeholder || "DD/MM/YYYY"}
                value={display}
                onChange={handleChange}
                maxLength={10}
                required={required}
                className={className}
                autoComplete="off"
            />
            {/* Hidden input para FormData */}
            {name && <input type="hidden" name={name} value={isoValue} />}
        </>
    );
}
