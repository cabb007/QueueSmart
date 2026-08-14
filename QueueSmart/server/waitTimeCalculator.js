/**
 * Assesses patient severity level based on vital signs and intake data..
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
    const { category, multiplier } = assessSeverity(vitals);

    
    
    if (!position || position <= 1 || !expectedDuration || expectedDuration <= 0) {
        return { estimatedWaitMinutes: 0, severityCategory: category };
    }

    const baselineWait = (position - 1) * expectedDuration;

    //  round to whole minutes
    const adjustedWait = Math.round(baselineWait * multiplier);

    return {
        estimatedWaitMinutes: adjustedWait,
        severityCategory: category
    };
}

/**
 * SMART FEATURE: Priority-Based Queue Handling
 *
 * Returns a numeric priority rank for a severity category, where a LOWER
 * number means HIGHER priority (should be seen sooner).
 * Urgent = 1, Moderate = 2, Standard = 3.
 *
 * @param {string} severityCategory - 'Urgent' | 'Moderate' | 'Standard'
 * @returns {number} rank - lower is higher priority
 */
function severityRank(severityCategory) {
    const ranks = { Urgent: 1, Moderate: 2, Standard: 3 };
    return ranks[severityCategory] ?? 3;
}

/**
 * SMART FEATURE: Notification Timing Optimization
 *
 * Calculates a personalized lead time (in minutes) for when to send the
 * "you're almost up" notification, instead of using one fixed threshold
 * for every patient.
 *
 * Logic:
 *  - Longer services get a longer lead time, since patients need more time
 *    to wrap up what they're doing and travel back to the clinic.
 *  - Urgent patients get a short, tight lead time since they're expected
 *    to already be nearby / ready to be seen immediately.
 *  - Lead time is clamped to a sensible range (5-30 min).
 *
 * @param {Object} service - { duration } expected service duration in minutes
 * @param {string} severityCategory - 'Urgent' | 'Moderate' | 'Standard'
 * @returns {number} leadTimeMinutes
 */
function computeNotificationLeadTime(service, severityCategory = 'Standard') {
    const duration = service?.duration > 0 ? service.duration : 15;

    let leadTime = Math.round(duration * 0.75) + 5;

    if (severityCategory === 'Urgent') {
        leadTime = Math.min(leadTime, 10);
    }

    return Math.min(30, Math.max(5, leadTime));
}

module.exports = {
    calculateWaitTime,
    assessSeverity,
    severityRank,
    computeNotificationLeadTime
};
