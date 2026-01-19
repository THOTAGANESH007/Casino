import React from "react";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  className = "",
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700",
    outline: "border-2 border-gray-300 bg-transparent hover:bg-gray-50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
      ${variants[variant]}
      ${sizes[size]}
      rounded-lg font-semibold transition-all duration-200
      cursor-pointer
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    >
      {children}
    </button>
  );
};

export default Button;
