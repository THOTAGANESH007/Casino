import React from "react";

const Card = ({ children, className = "", hover = false }) => {
  const baseClass = "bg-white rounded-lg shadow-md p-6";
  const hoverClass = hover
    ? "transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    : "";

  return (
    <div className={`${baseClass} ${hoverClass} ${className}`}>{children}</div>
  );
};

export default Card;
