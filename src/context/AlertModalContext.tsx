import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { PremiumAlertDialog, AlertVariant } from "../components/ui/PremiumAlertDialog";

export interface AlertModalOptions {
  title: string;
  message?: string;
  description?: string;
  problem?: string;
  detail?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  eyebrow?: string;
}

interface AlertModalContextType {
  confirm: (options: AlertModalOptions) => Promise<boolean>;
  alert: (options: AlertModalOptions) => Promise<void>;
  close: () => void;
}

const AlertModalContext = createContext<AlertModalContextType | undefined>(undefined);

export const AlertModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AlertModalOptions>({ title: "" });
  const [isSingleButton, setIsSingleButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Promise resolvers
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: AlertModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(options);
      setIsSingleButton(false);
      setIsLoading(false);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const alert = useCallback((options: AlertModalOptions): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({
        ...options,
        confirmText: options.confirmText || "Acknowledge",
      });
      setIsSingleButton(true);
      setIsLoading(false);
      setIsOpen(true);
      resolveRef.current = () => resolve();
    });
  }, []);

  const handleConfirm = async () => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setIsOpen(false);
  };

  return (
    <AlertModalContext.Provider value={{ confirm, alert, close: handleClose }}>
      {children}
      <PremiumAlertDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={config.title}
        message={config.message}
        description={config.description}
        problem={config.problem}
        detail={config.detail}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        variant={config.variant || "warning"}
        eyebrow={config.eyebrow}
        singleButton={isSingleButton}
        isLoading={isLoading}
      />
    </AlertModalContext.Provider>
  );
};

export const useAlertModal = (): AlertModalContextType => {
  const context = useContext(AlertModalContext);
  if (!context) {
    throw new Error("useAlertModal must be used within an AlertModalProvider");
  }
  return context;
};
