import React, { useState } from "react";
import { useWhatsAppStore } from "../stores/whatsapp.store";
import { GroupSettingsModal } from "./GroupSettingsModal";

interface WhatsAppGroupsListProps {
  selectedGroupIds?: string[];
  onGroupSelectionChange?: (selectedIds: string[]) => void;
}

export const WhatsAppGroupsList: React.FC<WhatsAppGroupsListProps> = ({
  selectedGroupIds = [],
  onGroupSelectionChange,
}) => {
  const { groups, getGroups, loading, error } = useWhatsAppStore();
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleGroupToggle = (groupId: string) => {
    if (!onGroupSelectionChange) return;

    const isSelected = selectedGroupIds.includes(groupId);
    if (isSelected) {
      onGroupSelectionChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onGroupSelectionChange([...selectedGroupIds, groupId]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">WhatsApp Групи</h3>
        <button
          onClick={getGroups}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          disabled={loading}
        >
          Оновити
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {groups.map((group) => {
              const isSelected = selectedGroupIds.includes(group.id);
              return (
                <li
                  key={group.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center">
                    {onGroupSelectionChange && (
                      <div className="flex-shrink-0 mr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleGroupToggle(group.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    )}
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356 1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {group.name}
                      </p>
                      {group.settings?.enabled && (
                        <p className="text-xs text-gray-500 mt-1">
                          Автоматична відправка: кожні{" "}
                          {group.settings.intervalMinutes}{" "}
                          {group.settings.intervalMinutes === 1
                            ? "хвилину"
                            : group.settings.intervalMinutes < 5
                            ? "хвилини"
                            : "хвилин"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsSettingsModalOpen(true);
                      }}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Налаштування"
                      aria-label="Налаштування"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Груп не знайдено</p>
        </div>
      )}

      {selectedGroup && (
        <GroupSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => {
            setIsSettingsModalOpen(false);
            setSelectedGroup(null);
          }}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onSave={getGroups}
        />
      )}
    </div>
  );
};
