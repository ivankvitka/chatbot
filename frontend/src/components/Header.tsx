import React, { useState, useEffect } from "react";
import { useWhatsAppStore } from "../stores/whatsapp.store";
import { useDambaStore } from "../stores/damba.store";
import { WhatsAppAuthModal } from "./WhatsAppAuthModal";
import { DambaAuthModal } from "./DambaAuthModal";
import { ZonesManagementModal } from "./ZonesManagementModal";
import { MapCenterSettingsModal } from "./MapCenterSettingsModal";
import { AuthStatusButton } from "./AuthStatusButton";

export const Header: React.FC = () => {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showDambaModal, setShowDambaModal] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);
  const [showMapCenterModal, setShowMapCenterModal] = useState(false);
  const { status, checkStatus } = useWhatsAppStore();
  const { isAuthenticated, checkStatus: checkDambaStatus } = useDambaStore();

  useEffect(() => {
    // Check WhatsApp status on mount and periodically
    checkStatus();
    checkDambaStatus();
    const interval = setInterval(() => {
      checkStatus();
      checkDambaStatus();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Chatbot Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMapCenterModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                title="Налаштування центру карти"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Центр карти
              </button>
              <button
                onClick={() => setShowZonesModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                title="Управління зонами"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Зони
              </button>
              <AuthStatusButton
                label="WhatsApp"
                icon={
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.769.966-.944 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                }
                isAuthenticated={status?.isReady ?? false}
                onClick={() => setShowWhatsAppModal(true)}
                bgColor="bg-green-600"
                hoverColor="hover:bg-green-700"
                focusRingColor="focus:ring-green-500"
              />
              <AuthStatusButton
                label="Damba"
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
                isAuthenticated={isAuthenticated}
                onClick={() => setShowDambaModal(true)}
                bgColor="bg-blue-600"
                hoverColor="hover:bg-blue-700"
                focusRingColor="focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </header>

      <WhatsAppAuthModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          // Refresh status after modal closes
          checkStatus();
        }}
      />

      <DambaAuthModal
        isOpen={showDambaModal}
        onClose={() => {
          setShowDambaModal(false);
          // Refresh status after modal closes
          checkDambaStatus();
        }}
      />

      <ZonesManagementModal
        isOpen={showZonesModal}
        onClose={() => setShowZonesModal(false)}
      />

      <MapCenterSettingsModal
        isOpen={showMapCenterModal}
        onClose={() => setShowMapCenterModal(false)}
      />
    </>
  );
};

export default Header;
