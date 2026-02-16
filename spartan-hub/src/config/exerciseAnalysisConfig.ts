export interface AnalyserConfig {
    targetAngles: Record<string, { target: number; tolerance: number; weight: number }>;
    thresholds: Record<string, number>;
    warnings: Record<string, string>;
}

export const EXERCISE_ANALYSIS_CONFIG: Record<string, AnalyserConfig> = {
    squat: {
        targetAngles: {
            backAngle: { target: 180, tolerance: 20, weight: 0.3 }
        },
        thresholds: {
            depthParallel: -0.02,
            valgusThreshold: 0.7
        },
        warnings: {
            lowDepth: 'Depth not reached: Aim for hip crease below knee level.',
            valgus: 'Knee instability: Keep knees tracking over toes.'
        }
    },
    deadlift: {
        targetAngles: {
            hipHinge: { target: 160, tolerance: 30, weight: 0.4 }
        },
        thresholds: {
            backStraightness: 0.8,
            barPathLimit: 0.1
        },
        warnings: {
            rounding: 'Back rounding detected: engage lats and keep chest up.'
        }
    },
    push_up: {
        targetAngles: {
            elbowAngle: { target: 45, tolerance: 20, weight: 0.3 }
        },
        thresholds: {
            backStraightness: 0.8,
            depthLimit: 0.7
        },
        warnings: {
            lowDepth: 'Low depth: Lower your chest closer to the floor.',
            rounding: 'Hips sagging or hiking: Keep your core tight.',
            flaring: 'Elbows flaring: Protect your shoulders.'
        }
    },
    bench_press: {
        targetAngles: {
            elbowAngle: { target: 90, tolerance: 40, weight: 0.3 }
        },
        thresholds: {
            backStraightness: 0.85,
            depthLimit: 0.7,
            barPathLimit: 0.1
        },
        warnings: {
            lowDepth: 'Low depth: Lower the bar to touch your chest.',
            rounding: 'Arched back: Maintain proper form.',
            flaring: 'Elbow flare: Keep elbows at appropriate angle.'
        }
    },
    overhead_press: {
        targetAngles: {
            overheadAngle: { target: 180, tolerance: 10, weight: 0.4 }
        },
        thresholds: {
            backStraightness: 0.8,
            coreEngagement: 0.7,
            barPathLimit: 0.15
        },
        warnings: {
            incompleteLockout: 'Incomplete lockout: Fully extend arms overhead.',
            rounding: 'Excessive arch: Maintain neutral spine.',
            weakCore: 'Weak core engagement: Brace your core throughout.'
        }
    },
    row: {
        targetAngles: {
            elbowRetraction: { target: 110, tolerance: 20, weight: 0.4 }
        },
        thresholds: {
            backStraightness: 0.8,
            shoulderStability: 0.7
        },
        warnings: {
            rounding: 'Back rounding detected: Keep your spine neutral.',
            limitedROM: 'Limited range: Pull the weight further towards your torso.'
        }
    },
    lunge: {
        targetAngles: {
            frontKnee: { target: 90, tolerance: 10, weight: 0.4 },
            torso: { target: 85, tolerance: 10, weight: 0.3 }
        },
        thresholds: {
            stability: 0.7
        },
        warnings: {
            lowDepth: 'Low depth: Aim for a 90-degree angle in the front knee.',
            forwardLean: 'Leaning too far forward: Keep chest up.'
        }
    },
    plank: {
        targetAngles: {
            bodyAlignment: { target: 180, tolerance: 10, weight: 0.5 }
        },
        thresholds: {
            backStraightness: 0.8,
            hipPosition: 0.8
        },
        warnings: {
            misalignment: 'Body misalignment: Keep your body in a straight line.',
            improperHips: 'Improper hip position: Keep hips level.',
            rounding: 'Hips sagging or hiking: Engage your core.'
        }
    }
};
