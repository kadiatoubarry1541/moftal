import React from "react";
import { COMPONENT_STYLES, combineClasses } from "../../styles/colors";

// Interfaces pour les props des composants
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

interface ButtonProps extends BaseProps {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "accent"
    | "outline"
    | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

interface CardProps extends BaseProps {
  variant?: "base" | "primary" | "success" | "warning" | "accent";
  hover?: boolean;
}

interface BadgeProps extends BaseProps {
  variant?: "primary" | "success" | "warning" | "neutral" | "accent";
}

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface TextareaProps extends Omit<InputProps, "type"> {
  rows?: number;
}

interface SelectProps extends Omit<InputProps, "type"> {
  options: { value: string; label: string; disabled?: boolean }[];
}

// Composant Button
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className,
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const baseStyle = COMPONENT_STYLES.button[variant];
  const sizeStyle = sizeClasses[size];
  const disabledStyle =
    disabled || loading ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combineClasses(baseStyle, sizeStyle, disabledStyle, className)}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};

// Composant Card
export const Card: React.FC<CardProps> = ({
  children,
  variant = "base",
  hover = true,
  className,
}) => {
  const baseStyle = COMPONENT_STYLES.card[variant];
  const hoverStyle = hover ? "hover:shadow-lg transition-all duration-300" : "";

  return (
    <div className={combineClasses(baseStyle, hoverStyle, className)}>
      {children}
    </div>
  );
};

// Composant Badge
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className,
}) => {
  const baseStyle = COMPONENT_STYLES.badge[variant];

  return (
    <span className={combineClasses(baseStyle, className)}>{children}</span>
  );
};

// Composant Input
export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  success,
  required,
  disabled,
  className,
}) => {
  const inputStyle = error
    ? COMPONENT_STYLES.input.error
    : success
      ? COMPONENT_STYLES.input.success
      : COMPONENT_STYLES.input.base;

  return (
    <div className={combineClasses("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className={combineClasses(
          inputStyle,
          disabled ? "opacity-50 cursor-not-allowed" : "",
        )}
      />
      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
};

// Composant Textarea
export const Textarea: React.FC<TextareaProps> = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  success,
  required,
  disabled,
  rows = 3,
  className,
}) => {
  const inputStyle = error
    ? COMPONENT_STYLES.input.error
    : success
      ? COMPONENT_STYLES.input.success
      : COMPONENT_STYLES.input.base;

  return (
    <div className={combineClasses("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        rows={rows}
        className={combineClasses(
          inputStyle,
          disabled ? "opacity-50 cursor-not-allowed" : "",
        )}
      />
      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
};

// Composant Select
export const Select: React.FC<SelectProps> = ({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  success,
  required,
  disabled,
  className,
}) => {
  const inputStyle = error
    ? COMPONENT_STYLES.input.error
    : success
      ? COMPONENT_STYLES.input.success
      : COMPONENT_STYLES.input.base;

  return (
    <div className={combineClasses("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className={combineClasses(
          inputStyle,
          disabled ? "opacity-50 cursor-not-allowed" : "",
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
};

// Composant Container
export const Container: React.FC<
  BaseProps & { size?: "base" | "narrow" | "wide" }
> = ({ children, size = "base", className }) => {
  const containerStyle = COMPONENT_STYLES.container[size];

  return (
    <div className={combineClasses(containerStyle, className)}>{children}</div>
  );
};

// Composant Grid
export const Grid: React.FC<BaseProps & { cols?: 1 | 2 | 3 | 4 | "auto" }> = ({
  children,
  cols = "auto",
  className,
}) => {
  const gridStyle =
    COMPONENT_STYLES.grid[`cols${cols}`] || COMPONENT_STYLES.grid.auto;

  return <div className={combineClasses(gridStyle, className)}>{children}</div>;
};

// Composant Section
export const Section: React.FC<
  BaseProps & { variant?: "base" | "primary" | "neutral" }
> = ({ children, variant = "base", className }) => {
  const sectionStyle = COMPONENT_STYLES.section[variant];

  return (
    <section className={combineClasses(sectionStyle, className)}>
      {children}
    </section>
  );
};

// Composant Header
export const Header: React.FC<BaseProps & { level: 1 | 2 | 3 | 4 }> = ({
  children,
  level,
  className,
}) => {
  const headerStyle = COMPONENT_STYLES.header[`h${level}`];

  const Component = `h${level}` as keyof React.JSX.IntrinsicElements;

  return React.createElement(
    Component,
    { className: combineClasses(headerStyle, className) },
    children,
  );
};

// Composant Loading Spinner
export const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center justify-center">
      <svg
        className={combineClasses(
          "animate-spin text-blue-600",
          sizeClasses[size],
        )}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

// Composant Modal
export const Modal: React.FC<
  BaseProps & {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: "sm" | "md" | "lg" | "xl";
  }
> = ({ children, isOpen, onClose, title, size = "md", className }) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>
        <div
          className={combineClasses(
            "relative bg-white rounded-xl shadow-xl w-full",
            sizeClasses[size],
            className,
          )}
        >
          {title && (
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

// Les exports de constantes sont dans styles/colors.ts
