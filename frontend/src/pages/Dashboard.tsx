import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { ScreenshotModal } from "../components/ScreenshotModal";
import { WhatsAppGroupsList } from "../components/WhatsAppGroupsList";
import { dambaApi } from "../services/damba.api";
import { useWhatsAppStore } from "../stores/whatsapp.store";

interface Screenshot {
  filename: string;
  url: string;
  createdAt: string;
  isAuthenticated?: boolean;
}

export const Dashboard: React.FC = () => {
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getGroups } = useWhatsAppStore();

  useEffect(() => {
    const loadScreenshot = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dambaApi.getScreenshot();
        if (response.screenshot) {
          setScreenshot(response.screenshot);
        } else if (response.isAuthenticated === false) {
          setError(
            "Користувач не автентифікований в Damba. Будь ласка, увійдіть в систему."
          );
        }
      } catch (err) {
        const errorMessage =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined;
        setError(errorMessage || "Не вдалося завантажити скріншот");
      } finally {
        setLoading(false);
      }
    };

    loadScreenshot();
    getGroups();
  }, [getGroups]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Screenshot Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Останній скріншот
                </h3>
                {screenshot && (
                  <span className="text-sm text-gray-500">
                    {new Date(screenshot.createdAt).toLocaleString("uk-UA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
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

              {!loading && !error && screenshot && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={screenshot.url}
                    alt="Останній скріншот"
                    className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsModalOpen(true)}
                  />
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Файл: {screenshot.filename}
                    </p>
                  </div>
                </div>
              )}

              {!loading && !error && !screenshot && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Скріншотів ще немає</p>
                </div>
              )}
            </div>

            {/* Groups Section */}
            <WhatsAppGroupsList />
          </div>
        </div>
      </div>
      {screenshot && (
        <ScreenshotModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          screenshotUrl={screenshot.url}
          filename={screenshot.filename}
          isAuthenticated={screenshot.isAuthenticated}
        />
      )}
    </div>
  );
};

export default Dashboard;
