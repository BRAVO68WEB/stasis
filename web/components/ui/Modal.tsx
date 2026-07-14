"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const EXIT_ANIMATION_MS = 120;

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      setIsVisible(false);
      onClose();
    }, EXIT_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsClosing(false);
      setIsVisible(true);
    } else if (isVisible) {
      handleClose();
    }
  }, [isOpen, isVisible, handleClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  const backdropClass = isClosing ? "modal-backdrop closing" : "modal-backdrop";
  const contentClass = isClosing ? "modal-content closing" : "modal-content";

  return (
    <div
      className={backdropClass}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={contentRef}
        className={contentClass}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <h2
            style={{ color: "var(--color-text-primary)" }}
            className="text-lg font-semibold mb-4"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
