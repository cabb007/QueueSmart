import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

const PatientDashboard = () => {
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [queueEntry, setQueueEntry] = useState(null);
  const [queueHistory, setQueueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!storedUser) {
      navigate("/");
      return;
    }

    setPatient(storedUser);

    const serviceId =
      localStorage.getItem("serviceId") || "s1";

    async function loadPatientData() {
      try {
        const [queueResponse, historyResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/queue/${serviceId}`),
            fetch(`${API_URL}/api/history/${storedUser.id}`),
          ]);

        if (!queueResponse.ok) {
          throw new Error(
            `Unable to retrieve queue: ${queueResponse.status}`
          );
        }

        if (!historyResponse.ok) {
          throw new Error(
            `Unable to retrieve history: ${historyResponse.status}`
          );
        }

        const queueData = await queueResponse.json();
        const historyData = await historyResponse.json();

        const matchingEntry = queueData.queue.find(
          (entry) => entry.userId === storedUser.id
        );

        setQueueEntry(matchingEntry || null);
        setQueueHistory(historyData.history || []);
        setError("");
      } catch (requestError) {
        console.error(
          "Unable to load patient dashboard:",
          requestError
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load patient information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPatientData();

    const intervalId = setInterval(
      loadPatientData,
      5000
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("serviceId");

    navigate("/");
  }

  function getInitials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Loading patient dashboard...
        </p>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const queuePosition = queueEntry?.position ?? null;

  const estimatedWaitMinutes =
    queueEntry?.estimatedWaitMinutes ?? null;

  const severityCategory =
    queueEntry?.severityCategory || "Not available";

  const initials = getInitials(patient.name);

  return (
    <div className="font-sans bg-slate-50 text-slate-900 min-h-screen">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-blue-600">
            QueueSmart
          </span>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-semibold text-slate-900">
                {patient.name}
              </span>
            </span>

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient profile */}
          <div className="lg:col-span-1 bg-white border border-blue-100 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col items-center text-center pb-6 border-b border-blue-50">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mb-3 shadow-inner">
                {initials || "PT"}
              </div>

              <h2
                className="text-xl font-extrabold tracking-tight mt-1"
                style={{ color: "#0f172a" }}
              >
                {patient.name}
              </h2>

              <p className="text-sm text-blue-600 font-medium">
                Patient ID: {patient.id}
              </p>
            </div>

            <div className="py-6 border-b border-blue-50 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                  Email
                </label>

                <p className="text-sm font-medium text-slate-800 break-words">
                  {patient.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                    Account Role
                  </label>

                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {patient.role}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                    Severity
                  </label>

                  <p className="text-sm font-medium text-slate-800">
                    {severityCategory}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                  Date of Birth
                </label>

                <p className="text-sm text-slate-500">
                  Not available
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                  Blood Type
                </label>

                <p className="text-sm text-slate-500">
                  Not available
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                  Emergency Contact
                </label>

                <p className="text-sm text-slate-500">
                  Not available
                </p>
              </div>
            </div>
          </div>

          {/* Main dashboard */}
          <div className="lg:col-span-2 space-y-8">
            {/* Queue status */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-md shadow-blue-100">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-white/20 text-xs font-medium rounded-full mb-2 backdrop-blur-sm">
                    {queueEntry
                      ? "Active Check-In"
                      : "No Active Check-In"}
                  </span>

                  <h3 className="text-xl font-bold tracking-tight">
                    Your Queue Position
                  </h3>

                  <p className="text-white/80 text-xs mt-1">
                    {queueEntry
                      ? "Please remain nearby. Your queue information updates automatically."
                      : "You are not currently in an active queue."}
                  </p>
                </div>

                <div className="flex items-baseline gap-2 bg-white/10 px-5 py-3 rounded-xl border border-white/10 self-start sm:self-center">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {queuePosition ?? "—"}
                  </span>

                  <span className="text-sm font-medium text-white/70">
                    {queueEntry ? "in line" : "not queued"}
                  </span>
                </div>
              </div>

              {queueEntry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  <div className="bg-white/10 border border-white/10 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-white/70">
                      Estimated Wait
                    </p>

                    <p className="text-2xl font-bold mt-1">
                      {estimatedWaitMinutes} minutes
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/10 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-white/70">
                      Queue Status
                    </p>

                    <p className="text-2xl font-bold mt-1 capitalize">
                      {queuePosition === 1
                        ? "Almost ready"
                        : queueEntry.status}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Current visit */}
            <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight border-b border-blue-50 pb-2">
                Current Visit Details
              </h3>

              {queueEntry ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                      Service
                    </label>

                    <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                      <p className="text-sm text-slate-700">
                        {queueEntry.serviceName ||
                          queueEntry.serviceId}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                      Joined Queue
                    </label>

                    <p className="text-sm text-slate-700">
                      {new Date(
                        queueEntry.joinedAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                      Recorded Vitals
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-500">
                          Temperature
                        </p>
                        <p className="text-sm font-semibold">
                          {queueEntry.vitals?.bodyTemp ??
                            "N/A"}
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-500">
                          Pain Level
                        </p>
                        <p className="text-sm font-semibold">
                          {queueEntry.vitals?.painLevel ??
                            "N/A"}
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-500">
                          Systolic BP
                        </p>
                        <p className="text-sm font-semibold">
                          {queueEntry.vitals?.sysBP ??
                            "N/A"}
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-500">
                          Diastolic BP
                        </p>
                        <p className="text-sm font-semibold">
                          {queueEntry.vitals?.diaBP ??
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No active visit information is available.
                </p>
              )}
            </div>

            {/* Queue history */}
            <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight border-b border-blue-50 pb-2">
                Queue History
              </h3>

              {queueHistory.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No previous queue history is available.
                </p>
              ) : (
                <div className="divide-y divide-blue-50">
                  {queueHistory.map((historyEntry) => (
                    <div
                      key={historyEntry.id}
                      className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 first:pt-0 last:pb-0"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          {historyEntry.serviceName ||
                            historyEntry.serviceId}
                        </h4>

                        <p className="text-xs text-slate-500 mt-0.5 capitalize">
                          Outcome:{" "}
                          {historyEntry.outcome.replace(
                            "_",
                            " "
                          )}
                        </p>
                      </div>

                      <span className="text-xs text-blue-500 font-medium">
                        {historyEntry.servedAt
                          ? new Date(
                              historyEntry.servedAt
                            ).toLocaleString()
                          : new Date(
                              historyEntry.joinedAt
                            ).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;