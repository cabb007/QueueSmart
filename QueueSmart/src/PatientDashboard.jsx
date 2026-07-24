import React from "react";

const PatientDashboard = () => {
  return (
    <div className="font-sans bg-slate-50 text-slate-900 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient profile card */}
          <div className="lg:col-span-1 bg-white border border-blue-100 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col items-center text-center pb-6 border-b border-blue-50">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mb-3 shadow-inner">
                JD
              </div>

              <h2 className="text-xl font-extrabold tracking-tight mt-1"
              style={{ color: "#0f172a" }}>
                John Doe
              </h2>

              <p className="text-sm text-blue-600 font-medium">
                Patient ID: #QS-98421
              </p>
            </div>

            <div className="py-6 border-b border-blue-50 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                  Date of Birth
                </label>

                <p className="text-sm font-medium text-slate-800">
                  October 14, 1992
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                    Age
                  </label>

                  <p className="text-sm font-medium text-slate-800">
                    33 Years Old
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5">
                    Blood Type
                  </label>

                  <p className="text-sm font-medium text-slate-800">
                    O Positive (O+)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                Emergency Contact
              </label>

              <p className="text-sm font-semibold text-slate-800">
                Jane Doe{" "}
                <span className="font-normal text-slate-500">
                  (Spouse)
                </span>
              </p>

              <p className="text-xs text-blue-600 mt-0.5">
                +1 (555) 019-2834
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Queue position card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-md shadow-blue-100">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-white/20 text-xs font-medium rounded-full mb-2 backdrop-blur-sm">
                    Active Check-In
                  </span>

                  <h3 className="text-xl font-bold tracking-tight">
                    Your Queue Position
                  </h3>

                  <p className="text-white/80 text-xs mt-1">
                    Please remain nearby. You will receive an alert
                    shortly.
                  </p>
                </div>

                <div className="flex items-baseline gap-2 bg-white/10 px-5 py-3 rounded-xl border border-white/10 self-start sm:self-center">
                  <span className="text-5xl font-extrabold tracking-tight">
                    3
                  </span>

                  <span className="text-sm font-medium text-white/70">
                    in line
                  </span>
                </div>
              </div>
            </div>

            {/* Current visit details */}
            <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight border-b border-blue-50 pb-2">
                Current Visit Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                    Reason for Visit Today
                  </label>

                  <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Severe cough and congestion lasting over 4 days,
                      mild sore throat, and experiencing alternating
                      fever chills overnight.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                    Current Active Medications
                  </label>

                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 text-xs font-medium rounded-lg">
                      Amoxicillin (500mg)
                    </span>

                    <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 text-xs font-medium rounded-lg">
                      Cetirizine (10mg)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical history */}
            <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight border-b border-blue-50 pb-2">
                Past Medical History
              </h3>

              <div className="divide-y divide-blue-50">
                <div className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Annual Comprehensive Physical
                    </h4>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Routine health screening & vaccine updates
                    </p>
                  </div>

                  <span className="text-xs text-blue-500 font-medium">
                    May 14, 2025
                  </span>
                </div>

                <div className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Acute Bronchitis Treatment
                    </h4>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Prescribed inhaler course and steroid tablets
                    </p>
                  </div>

                  <span className="text-xs text-blue-500 font-medium">
                    Dec 02, 2024
                  </span>
                </div>

                <div className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Allergy Evaluation Consultation
                    </h4>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Identified mild pollen and dust sensitivity
                      metrics
                    </p>
                  </div>

                  <span className="text-xs text-blue-500 font-medium">
                    Aug 19, 2023
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;