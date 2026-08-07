import React from 'react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

export default function QueueStatus() {
  const navigate = useNavigate();

  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWaitTime, setEstimatedWaitTime] =  useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statusStyles = {
    waiting: "bg-yellow-50 text-yellow-700 border-yellow-200",
    "almost ready": "bg-blue-50 text-blue-700 border-blue-200",
    served: "bg-green-50 text-green-700 border-green-200",
  };

  useEffect(() => {
    const serviceId = "s1";
    
    const storedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const userId = storedUser?.id;

    if(!userId){
      setError("No logged-in user found");
      setLoading(false);
      return;
    }

    async function getQueueStatus() {
      try {
        const response = await fetch(
          `http://localhost:3001/api/queue/${serviceId}`
        );

        if (!response.ok) {
          throw new Error(
            `Unable to retrieve queue status: ${response.status}`
          );
        }

        const data = await response.json();

        const patientEntry = data.queue.find(
          (entry) => entry.userId === userId
        );

        if (!patientEntry) {
          setQueuePosition(null);
          setEstimatedWaitTime("");
          setStatus("served");
          setError("");
          return;
        }

        setQueuePosition(patientEntry.position);

        setEstimatedWaitTime(
          `${patientEntry.estimatedWaitMinutes} minutes`
        );

        if (patientEntry.position === 1) {
          setStatus("almost ready");
        } else {
          setStatus("waiting");
        }

        setError("");
      } catch (error) {
        console.error("Queue status request failed:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to retrieve queue status"
        );
      } finally {
        setLoading(false);
      }
    }

    // Retrieve the status immediately.
    getQueueStatus();

    // Retrieve an updated status every five seconds.
    const intervalId = setInterval(getQueueStatus, 5000);

    // Stop the interval when the component is removed.
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  function handleLogout() {
    navigate("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading queue status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-50 text-slate-900 min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <span className="inline-block px-3 py-1 bg-white/20 text-xs font-medium rounded-full mb-3">
              Live Queue Status
            </span>

            <h1 className="text-2xl font-bold tracking-tight">
              Your Queue Status
            </h1>

            <p className="text-white/80 text-sm mt-1">
              Please stay nearby while we prepare for your visit.
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Current Position
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-slate-900">
                  {queuePosition}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  in queue
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Estimated Wait Time
              </p>

              <p className="text-4xl font-extrabold text-slate-900">
                {estimatedWaitTime}
              </p>
            </div>

            <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Status Update
              </p>

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold capitalize ${statusStyles[status]}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {status}
              </div>

              <p className="text-sm text-slate-500 mt-3">
                {status === "waiting" &&
                  "You are checked in and currently waiting to be called."}

                {status === "almost ready" &&
                  "You are almost ready to be seen. Please stay close."}

                {status === "served" &&
                  "You have been served. Thank you for using QueueSmart."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}