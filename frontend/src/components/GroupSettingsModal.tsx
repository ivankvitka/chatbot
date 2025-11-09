import React, { useEffect, useState, useCallback } from "react";
import { whatsappApi } from "../services/whatsapp.api";

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSave?: () => void;
}

const INTERVAL_OPTIONS = [1, 5, 10, 15, 30, 60];

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [enabled, setEnabled] = useState(false);
  const [reactOnMessage, setReactOnMessage] = useState("");
  const [shouldAlert, setShouldAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await whatsappApi.getGroupSettings(groupId);
      if (response.settings) {
        setIntervalMinutes(response.settings.intervalMinutes);
        setEnabled(response.settings.enabled);
        setReactOnMessage(response.settings.reactOnMessage || "");
        setShouldAlert(response.settings.shouldAlert || false);
      } else {
        // Default values if no settings exist
        setIntervalMinutes(10);
        setEnabled(false);
        setReactOnMessage("");
        setShouldAlert(false);
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
  }, [groupId]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await whatsappApi.updateGroupSettings(
        groupId,
        groupName,
        intervalMinutes,
        enabled,
        reactOnMessage || undefined,
        shouldAlert
      );
      onSave?.();
      onClose();
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

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Ви впевнені, що хочете видалити налаштування для цієї групи?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await whatsappApi.deleteGroupSettings(groupId);
      onSave?.();
      onClose();
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося видалити налаштування");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Налаштування групи
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрити"
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

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Група:</p>
          <p className="text-base text-gray-900">{groupName}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Увімкнути автоматичну відправку скріншотів
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Інтервал відправки:
              </label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {INTERVAL_OPTIONS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval} хв
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Реагувати на повідомлення (ключове слово):
              </label>
              <input
                type="text"
                value={reactOnMessage}
                onChange={(e) => setReactOnMessage(e.target.value)}
                placeholder="наприклад: небо"
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Якщо вказано, скріншот буде відправлено негайно, коли в групі
                з'явиться повідомлення з цим словом
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shouldAlert}
                  onChange={(e) => setShouldAlert(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Відправляти скріншот при перетині зон
                </span>
              </label>
              <p className="mt-1 ml-6 text-xs text-gray-500">
                Скріншот буде автоматично відправлено в групу, коли відбудеться
                перетин зони
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Видалити
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
