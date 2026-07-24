const { calculateWaitTime, assessSeverity } = require('../utils/waitTimeCalculator');

describe('Wait-Time Estimation & Severity Module', () => {

    describe('assessSeverity()', () => {
        test('returns Standard category for normal vitals', () => {
            const result = assessSeverity({ bodyTemp: 98.6, painLevel: 2, sysBP: 120, diaBP: 80 });
            expect(result.category).toBe('Standard');
            expect(result.multiplier).toBe(1.0);
        });

        test('returns Moderate category for moderate fever or pain', () => {
            const result = assessSeverity({ bodyTemp: 100.8, painLevel: 6, sysBP: 130, diaBP: 85 });
            expect(result.category).toBe('Moderate');
            expect(result.multiplier).toBe(0.75);
        });

        test('returns Urgent category for high fever, severe pain, or dangerous BP', () => {
            const result = assessSeverity({ bodyTemp: 103.0, painLevel: 9, sysBP: 170, diaBP: 105 });
            expect(result.category).toBe('Urgent');
            expect(result.multiplier).toBe(0.25);
        });
    });

    describe('calculateWaitTime()', () => {
        test('returns 0 wait time for position 1 (next in line)', () => {
            const res = calculateWaitTime(1, 15, { painLevel: 2 });
            expect(res.estimatedWaitMinutes).toBe(0);
        });

        test('calculates standard wait time correctly (position 3, 15 min duration)', () => {
            // Baseline: (3 - 1) * 15 = 30 mins
            const res = calculateWaitTime(3, 15, { bodyTemp: 98.6, painLevel: 2 });
            expect(res.estimatedWaitMinutes).toBe(30);
            expect(res.severityCategory).toBe('Standard');
        });

        test('reduces wait time for high severity (Urgent)', () => {
            // Baseline: (5 - 1) * 20 = 80 mins; Urgent Multiplier: 0.25 -> 20 mins
            const res = calculateWaitTime(5, 20, { painLevel: 9 });
            expect(res.estimatedWaitMinutes).toBe(20);
            expect(res.severityCategory).toBe('Urgent');
        });

        test('handles invalid inputs gracefully', () => {
            expect(calculateWaitTime(0, 15).estimatedWaitMinutes).toBe(0);
            expect(calculateWaitTime(3, null).estimatedWaitMinutes).toBe(0);
        });
    });
});