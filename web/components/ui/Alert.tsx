"use client";

import { ReactNode } from "react";

type AlertType = "error" | "success" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  children: ReactNode;
  className?: string;
}

const typeStyles: Record<AlertType, string> = {
  error: "alert-error",
  success: "alert-success",
  warning: "alert-warning",
  info: "alert-info",
};

export default function Alert({ type, children, className = "" }: AlertProps) {
  return (
    <div className={`alert ${typeStyles[type]} ${className}`} role="alert">
      {children}
    </div>
  );
}
