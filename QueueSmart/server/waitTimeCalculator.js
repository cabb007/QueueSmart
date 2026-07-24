/**
 * Assesses patient severity level based on vital signs and intake data.
 * @param {Object} vitals - Patient vitals { bodyTemp, painLevel, sysBP, diaBP }
 * @returns {Object} { category: string, multiplier: number }
 */
function assessSeverity(vitals = {}) {
    const { bodyTemp = 98.6, painLevel = 0, sysBP = 120, diaBP = 80 } = vitals;

    // High Severity / Urgent Conditions
    if (bodyTemp >= 102.0 || painLevel >= 8 || sysBP >= 160 || sysBP <= 90 || diaBP >= 100) {
        return { category: 'Urgent', multiplier: 0.25 };
    }

    // Moderate Severity Conditions
    if (bodyTemp >= 100.4 || painLevel >= 5 || sysBP >= 140 || diaBP >= 90) {
        return { category: 'Moderate', multiplier: 0.75 };
    }

    // Low / Standard Severity
    return { category: 'Standard', multiplier: 1.0 };
}

/**
 * Calculates estimated wait time considering position, duration, and vitals.
 * @param {number} position - 1-based queue position (1 = next in line)
 * @param {number} expectedDuration - Service duration in minutes
 * @param {Object} vitals - Optional patient vitals
 * @returns {Object} { estimatedWaitMinutes, severityCategory }
 */
function calculateWaitTime(position, expectedDuration, vitals = {}) {
    // Edge-case guards
    if (!position || position <= 1 || !expectedDuration || expectedDuration <= 0) {
        return { estimatedWaitMinutes: 0, severityCategory: 'Standard' };
    }

    const baselineWait = (position - 1) * expectedDuration;
    const { category, multiplier } = assessSeverity(vitals);

    //  round to whole minutes
    const adjustedWait = Math.round(baselineWait * multiplier);

    return {
        estimatedWaitMinutes: adjustedWait,
        severityCategory: category
    };
}

module.exports = {
    calculateWaitTime,
    assessSeverity
};