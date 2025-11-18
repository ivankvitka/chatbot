import React, { useEffect, useState, useCallback } from "react";
import { dambaApi, type Zone } from "../services/damba.api";

interface ZonesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZonesManagementModal: React.FC<ZonesManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newZoneId, setNewZoneId] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editName, setEditName] = useState("");
  const [manualZoneIdInput, setManualZoneIdInput] = useState("");

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const zones = await dambaApi.getAllZones();
      setZones(zones);
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося завантажити зони");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadZones();
    }
  }, [isOpen, loadZones]);

  const handleCreateZone = async () => {
    const zoneIdToUse = newZoneId || manualZoneIdInput;
    if (!zoneIdToUse.trim() || !newZoneName.trim()) {
      setError("Будь ласка, заповніть всі поля");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dambaApi.createZone(zoneIdToUse.trim(), newZoneName.trim());
      setNewZoneId("");
      setNewZoneName("");
      setManualZoneIdInput("");
      await loadZones();
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося створити зону");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateZone = async (zone: Zone) => {
    if (!editName.trim()) {
      setError("Назва не може бути порожньою");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dambaApi.updateZone(zone.id, editName.trim());
      setEditingZone(null);
      setEditName("");
      await loadZones();
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося оновити зону");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    if (
      !window.confirm(`Ви впевнені, що хочете видалити зону "${zone.name}"?`)
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dambaApi.deleteZone(zone.id);
      await loadZones();
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Не вдалося видалити зону");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (zone: Zone) => {
    setEditingZone(zone);
    setEditName(zone.name);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingZone(null);
    setEditName("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Управління зонами</h3>
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

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Add new zone form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Додати нову зону
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone ID:
                </label>
                <input
                  type="text"
                  value={manualZoneIdInput}
                  onChange={(e) => {
                    setManualZoneIdInput(e.target.value);
                    setNewZoneId("");
                  }}
                  placeholder="Введіть Zone ID вручну"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Назва зони:
                </label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="наприклад: Зона 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <button
                  onClick={handleCreateZone}
                  disabled={
                    saving || (!newZoneId && !manualZoneIdInput) || !newZoneName
                  }
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Додати
                </button>
              </div>
            </div>
          </div>

          {/* Zones list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Немає збережених зон. Додайте першу зону вище.
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Збережені зони ({zones.length})
              </h4>
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {editingZone?.id === zone.id ? (
                    <>
                      <div className="flex-1 mr-4">
                        <div className="text-sm text-gray-500 mb-1">
                          Zone ID: {zone.zoneId}
                        </div>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateZone(zone)}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Зберегти
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          Скасувати
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {zone.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Zone ID: {zone.zoneId}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(zone)}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Редагувати
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Видалити
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
