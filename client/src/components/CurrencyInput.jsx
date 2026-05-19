import { useState, useEffect, useRef } from 'react';

export default function CurrencyInput({ value, onChange, name, placeholder, className, required, id }) {
    const [displayValue, setDisplayValue] = useState('');
    const inputRef = useRef(null);

    // Format helper
    const formatValue = (val) => {
        if (!val && val !== 0) return '';
        const strVal = val.toString().replace(/,/g, '');
        const parts = strVal.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    // Update display value when prop value changes externally
    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setDisplayValue(formatValue(value));
        }
    }, [value]);

    const handleChange = (e) => {
        let val = e.target.value;

        // Remove invalid characters (keep digits, dots, commas)
        // Check if consistent with currency format
        const rawValue = val.replace(/,/g, '');

        // Allow numeric parts and one dot
        if (/^\d*\.?\d*$/.test(rawValue)) {
            // Format immediately for display
            const formatted = formatValue(rawValue);
            setDisplayValue(formatted);

            // Send raw number to parent
            onChange({
                target: {
                    name: name,
                    value: rawValue
                }
            });
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={displayValue}
            onChange={handleChange}
            className={className}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
        />
    );
}
