import React, { useEffect, useState, useCallback } from "react";
import { Header } from "../components/Header";
import { ScreenshotModal } from "../components/ScreenshotModal";
import { WhatsAppGroupsList } from "../components/WhatsAppGroupsList";
import { dambaApi } from "../services/damba.api";
import { whatsappApi } from "../services/whatsapp.api";
import { useWhatsAppStore } from "../stores/whatsapp.store";
import { useDambaStore } from "../stores/damba.store";

interface Screenshot {
  filename: string;
  url: string;
  createdAt: string;
  isAuthenticated?: boolean;
}

export const Dashboard: React.FC = () => {
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const { getGroups } = useWhatsAppStore();
  const { checkStatus } = useDambaStore();

  const loadScreenshot = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
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
        // Handle 401 Unauthorized from guard
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 401
        ) {
          setError(
            "Користувач не автентифікований в Damba. Будь ласка, увійдіть в систему."
          );
          // Update store status
          await checkStatus();
        } else {
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : undefined;
          setError(errorMessage || "Не вдалося завантажити скріншот");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [checkStatus]
  );

  useEffect(() => {
    checkStatus();
    loadScreenshot();
    getGroups();

    // Set up automatic refresh every 10 seconds
    // Only refresh if user is authenticated to Damba
    const intervalId = setInterval(async () => {
      await checkStatus();
      // Get current authentication status from store
      const currentStatus = useDambaStore.getState().isAuthenticated;
      if (currentStatus) {
        loadScreenshot(true);
      }
    }, 20000); // 20000 milliseconds = 20 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [getGroups, checkStatus, loadScreenshot]);

  const handleSend = useCallback(async () => {
    if (selectedGroupIds.length === 0) {
      setSendError("Будь ласка, оберіть хоча б одну групу");
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const messageText = message.trim() || undefined;
      const response = await whatsappApi.sendMessageToGroups(
        selectedGroupIds,
        messageText
      );

      // Check if all messages were sent successfully
      interface SendResult {
        groupId: string;
        success: boolean;
        error?: string;
      }
      const allSuccess = (response.results as SendResult[]).every(
        (r) => r.success
      );
      if (allSuccess) {
        setSendSuccess(true);
        setMessage("");
        setSelectedGroupIds([]);
        setTimeout(() => setSendSuccess(false), 3000);
      } else {
        const errors = (response.results as SendResult[])
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join(", ");
        setSendError(`Помилки при відправці: ${errors}`);
      }
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setSendError(errorMessage || "Не вдалося відправити повідомлення");
    } finally {
      setSending(false);
    }
  }, [selectedGroupIds, message]);

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
                <div className="flex items-center gap-3">
                  {screenshot && (
                    <span className="text-sm text-gray-500">
                      {new Date(screenshot.createdAt).toLocaleString("uk-UA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                  <button
                    onClick={() => loadScreenshot(true)}
                    disabled={loading || refreshing}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Оновити скріншот"
                  >
                    {refreshing ? (
                      <svg
                        className="animate-spin h-4 w-4 text-gray-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                  </button>
                </div>
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
            <WhatsAppGroupsList
              selectedGroupIds={selectedGroupIds}
              onGroupSelectionChange={setSelectedGroupIds}
            />
          </div>

          {/* Send Message Form */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Відправити повідомлення
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Повідомлення (залиште порожнім, щоб відправити тільки
                  скріншот)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введіть повідомлення..."
                />
              </div>

              {sendError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  Повідомлення успішно відправлено!
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {selectedGroupIds.length > 0
                    ? `Обрано груп: ${selectedGroupIds.length}`
                    : "Оберіть групи зі списку вище"}
                </p>
                <button
                  onClick={handleSend}
                  disabled={sending || selectedGroupIds.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Відправка...
                    </>
                  ) : (
                    "Відправити"
                  )}
                </button>
              </div>
            </div>
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
