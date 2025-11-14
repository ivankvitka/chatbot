import React, { type ReactNode } from "react";

interface AuthStatusButtonProps {
  label: string;
  icon: ReactNode;
  isAuthenticated: boolean;
  onClick: () => void;
  bgColor: string;
  hoverColor: string;
  focusRingColor: string;
}

export const AuthStatusButton: React.FC<AuthStatusButtonProps> = ({
  label,
  icon,
  isAuthenticated,
  onClick,
  bgColor,
  hoverColor,
  focusRingColor,
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${bgColor} ${hoverColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${focusRingColor} transition-colors duration-200 relative`}
    >
      <span className="w-5 h-5 mr-2">{icon}</span>
      {label}
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        {isAuthenticated ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        )}
      </span>
    </button>
  );
};

export default AuthStatusButton;
