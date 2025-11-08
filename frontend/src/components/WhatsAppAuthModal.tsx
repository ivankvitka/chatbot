import React, { useState, useEffect } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { whatsappApi } from '../services/whatsapp.api';

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ isReady: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadWhatsAppStatus();
      loadWhatsAppQR();
    }
  }, [isOpen]);

  const loadWhatsAppStatus = async () => {
    try {
      const status = await whatsappApi.getStatus();
      setWhatsappStatus(status);
    } catch (error) {
      console.error('Failed to load WhatsApp status:', error);
    }
  };

  const loadWhatsAppQR = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await whatsappApi.getQR();
      if (response.qr) {
        setWhatsappQR(response.qr);
      } else {
        setError('QR код не доступний. Можливо, WhatsApp вже підключено або виникла помилка.');
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(errorMessage || 'Помилка завантаження QR коду');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">WhatsApp Авторизація</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {whatsappStatus?.isReady ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">WhatsApp успішно підключено!</p>
          </div>
        ) : (
          <div className="text-center py-4">
            {loading ? (
              <div className="py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Завантаження QR коду...</p>
              </div>
            ) : whatsappQR ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Відскануйте QR код за допомогою WhatsApp на вашому телефоні
                </p>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <QRCode value={whatsappQR} size={256} />
                  </div>
                </div>
                <button
                  onClick={loadWhatsAppQR}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Оновити QR код
                </button>
              </div>
            ) : (
              <div className="py-8">
                <p className="text-gray-600 mb-4">{error || 'QR код не доступний'}</p>
                <button
                  onClick={loadWhatsAppQR}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Спробувати ще раз
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAuthModal;

