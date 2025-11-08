import React, { useState } from "react";
import { useDambaStore } from "../stores/damba.store";

interface DambaAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DambaAuthModal: React.FC<DambaAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dambaToken, setDambaToken] = useState("");
  const { loading, error, saveToken, setError } = useDambaStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await saveToken(dambaToken);
      setDambaToken("");
      onClose();
      alert("Damba токен успішно збережено!");
    } catch {
      // Error is already set in store
    }
  };

  const handleClose = () => {
    setDambaToken("");
    setError("");
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
          <h3 className="text-lg font-bold text-gray-900">Damba Авторизація</h3>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dambaToken"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Damba Token
            </label>
            <input
              id="dambaToken"
              type="text"
              value={dambaToken}
              onChange={(e) => setDambaToken(e.target.value)}
              placeholder="Введіть ваш Damba token"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
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
              disabled={loading || !dambaToken}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Збереження..." : "Зберегти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DambaAuthModal;
