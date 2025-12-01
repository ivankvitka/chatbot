import React, { useState, useEffect } from "react";
import { dambaApi } from "../services/damba.api";

interface MapCenterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MapCenterSettingsModal: React.FC<MapCenterSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMapCenter();
    }
  }, [isOpen]);

  const loadMapCenter = async () => {
    try {
      setLoading(true);
      setError(null);
      const mapCenter = await dambaApi.getMapCenter();
      if (mapCenter) {
        setLatitude(mapCenter[0].toString());
        setLongitude(mapCenter[1].toString());
      } else {
        // Default values
        setLatitude("50.91410065304415");
        setLongitude("34.39479231834412");
      }
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося завантажити налаштування");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      setError("Будь ласка, введіть коректні числові значення");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Широта повинна бути в діапазоні від -90 до 90");
      return;
    }

    if (lon < -180 || lon > 180) {
      setError("Довгота повинна бути в діапазоні від -180 до 180");
      return;
    }

    try {
      setSaving(true);
      await dambaApi.saveMapCenter([lat, lon]);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося зберегти налаштування");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setLatitude("");
    setLongitude("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleClose}
    >
      <div
        className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Налаштування центру карти
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="latitude"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Широта (Latitude)
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="50.91410065304415"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="longitude"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Довгота (Longitude)
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="34.39479231834412"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="text-sm text-gray-500">
              <p>
                Після збереження браузер буде автоматично перезапущено для
                застосування змін.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-700">
                  Налаштування успішно збережено! Браузер перезапускається...
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MapCenterSettingsModal;

