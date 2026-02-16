import { Type } from "@sinclair/typebox";
import axios from 'axios';
import type {
    UserProfile,
    Routine,
    EvaluationFormData,
    WorkoutHistory,
    DailyLog,
    AiResponse,
    WeeklyCheckIn,
    Milestone,
    ChronotypeAnalysis,
    TrainingCycle,
    HabitLog,
    KeystoneHabit,
    ReconditioningPlan,
    ScheduledWorkout
} from '../types';
import { logger } from '../utils/logger';
import { masterPrompt } from '../AI/prompts/masterPrompt';
import { plannerPrompt, routineSchema } from '../AI/prompts/plannerPrompt';
import { initialPlanPrompt, initialPlanSchema } from '../AI/prompts/initialPlanPrompt';
import { biomechanicPrompt } from '../AI/prompts/biomechanicPrompt';
import { oraclePrompt, oracleMilestoneSchema } from '../AI/prompts/oraclePrompt';
import { strategistPrompt } from '../AI/prompts/strategistPrompt';
import { adaptationPrompt } from '../AI/prompts/adaptationPrompt';
import { successManualPrompt } from '../AI/prompts/successManualPrompt';
import { chronotypePrompt, chronotypeSchema } from '../AI/prompts/chronotypePrompt';
import { routineTranslatorPrompt } from '../AI/prompts/routineTranslatorPrompt';
import { reframingPrompt, reframingSchema } from '../AI/prompts/reframingPrompt';
import { nutritionistPrompt, nutritionPlanSchema } from '../AI/prompts/nutritionistPrompt';
import { prehabPrompt, prehabSchema } from '../AI/prompts/prehabPrompt';
import { resilienceAnalystPrompt } from '../AI/prompts/resilienceAnalystPrompt';
import { cyclicalReviewPrompt, cyclicalReviewSchema } from '../AI/prompts/cyclicalReviewPrompt';
import { periodizationGuardPrompt } from '../AI/prompts/periodizationGuardPrompt';
import { restructureSchedulePrompt, restructureScheduleSchema } from '../AI/prompts/restructureSchedulePrompt';
import { compensationPrompt } from '../AI/prompts/compensationPrompt';
import { timeAdjustmentPrompt } from '../AI/prompts/timeAdjustmentPrompt.ts';

const reconditioningPrompt = `
Eres el "Especialista en Recuperación Spartan", un agente de IA experto en recuperación física y mental, combinando conocimientos de fisioterapia deportiva y psicología del rendimiento. Tu propósito es crear planes de reacondicionamiento personalizados basados en la petición del usuario y su estado actual. TU RESPUESTA DEBE SER SIEMPRE EN CASTELLANO.

**Directivas Principales:**

1.  **SOLO Salida JSON:** Tu respuesta DEBE ser un único objeto JSON válido que se ajuste al esquema \`ReconditioningPlan\`. No incluyas ningún texto, markdown o explicaciones fuera de la estructura JSON.
2.  **Analiza la Petición y el Perfil:** Se te dará un perfil de usuario y una petición específica (ej: "estoy agotado mentalmente", "mis piernas están muy doloridas"). Analiza la petición para entender la necesidad principal (física, mental o mixta). Usa el perfil del usuario (especialmente \`dailyLogs\` recientes, \`stressLevel\`) para contextualizar la necesidad.
3.  **Principios de Diseño de Recuperación:**
    *   **Recuperación Física:** Si la petición es sobre dolor muscular (DOMS), incluye actividades como caminata ligera, estiramiento dinámico suave, o foam rolling para promover el flujo sanguíneo.
    *   **Recuperación Mental:** Si la petición es sobre estrés, fatiga mental o falta de sueño, incluye actividades como respiración diafragmática (ej: box breathing), meditación guiada corta o mindfulness.
    *   **Enfoque Mixto:** Si la petición es general, combina ambos tipos de actividades.
4.  **Estructura del Plan:**
    *   **Nombre:** Dale al plan un nombre claro y funcional (ej: "Protocolo de Alivio Muscular", "Reseteo Mental").
    *   **Enfoque:** Establece el enfoque como 'physical', 'mental', o 'mixed'.
    *   **Actividades:** Crea de 2 a 4 actividades. Para cada una, define su tipo ('physical' o 'mental') y una descripción clara y concisa (ej: "15 minutos a ritmo conversacional", "5 minutos, inhala 4s, sostén 4s, exhala 4s, sostén 4s").

5.  **Adherencia Estricta al Esquema:** Asegúrate de que tu salida JSON final sea perfectamente válida según el esquema proporcionado.
`;

const reconditioningPlanSchema = Type.Object({
    name: Type.String({ description: "Un nombre claro y funcional para el plan." }),
    focus: Type.String({ description: "El enfoque del plan: 'physical', 'mental', o 'mixed'." }),
    activities: Type.Array(Type.Object({
        name: Type.String({ description: "El nombre de la actividad de recuperación." }),
        type: Type.String({ description: "El tipo de actividad: 'physical' o 'mental'." }),
        description: Type.String({ description: "Una instrucción breve y clara sobre cómo realizar la actividad (ej: duración, técnica)." })
    }, { description: "Lista de actividades de recuperación" }))
});

// Ollama configuration
const OLLAMA_HOST = typeof window !== 'undefined'
    ? '/ollama' // Use proxy path in browser
    : (typeof process !== 'undefined' && process.env.OLLAMA_HOST) || 'http://localhost:11434'; // Use env var or default in Node.js
const OLLAMA_MODEL = 'gemma2:2b';

export interface InitialPlanResponse {
    routine: Omit<Routine, 'id'>;
    keystoneHabitSuggestion: Omit<KeystoneHabit, 'id' | 'currentStreak' | 'longestStreak'>;
}

export interface RecalculateResponse {
    newSchedule: ScheduledWorkout[];
    notification: string;
}

// Helper to safely parse JSON from AI response
const safeJsonParse = <T,>(jsonString: string): T | null => {
    try {
        // The API sometimes returns ``json ... ```, so we strip it.
        const sanitizedString = jsonString.replace(/^```json\s*|```\s*$/g, '');
        return JSON.parse(sanitizedString) as T;
    } catch (e) {
        logger.error('Failed to parse AI response JSON', {
            context: 'ai-service',
            metadata: {
                error: e instanceof Error ? e.message : String(e),
                rawString: jsonString
            }
        });
        return null;
    }
};

// Helper function to call Ollama API with streaming support
export const callOllama = async (prompt: string, onProgress?: (chunk: string) => void): Promise<string> => {
    try {
        // If onProgress callback is provided, use streaming
        const useStreaming = !!onProgress;

        // Determine the base URL based on environment
        const isBrowser = typeof window !== 'undefined';
        const baseURL = isBrowser ? '/ollama' : (typeof process !== 'undefined' && process.env.OLLAMA_HOST) || 'http://localhost:11434';

        const response = await axios.post(
            `${baseURL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: useStreaming,
                format: "json"
            },
            {
                timeout: 120000, // 120 second timeout for model loading
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: useStreaming && !isBrowser ? 'stream' : 'json' // Don't use stream response type in browser
            }
        );

        if (useStreaming && response.data && !isBrowser) {
            // Handle streaming response in Node.js environment
            let fullResponse = '';

            return new Promise((resolve, reject) => {
                response.data.on('data', (chunk: any) => {
                    try {
                        // Chunk might be multiple JSON objects separated by newlines
                        const chunkString = chunk.toString();
                        const lines = chunkString.split('\n').filter((line: string) => line.trim());

                        for (const line of lines) {
                            if (line.trim()) {
                                const jsonData = JSON.parse(line);
                                if (jsonData.response) {
                                    fullResponse += jsonData.response;
                                    // Notify progress
                                    if (onProgress) {
                                        onProgress(jsonData.response);
                                    }
                                }

                                // If done, resolve the promise
                                if (jsonData.done) {
                                    resolve(fullResponse);
                                }
                            }
                        }
                    } catch (parseError) {
                        logger.error('Error parsing streaming chunk', {
                            context: 'ai-service',
                            metadata: {
                                error: parseError instanceof Error ? parseError.message : String(parseError)
                            }
                        });
                    }
                });

                response.data.on('end', () => {
                    resolve(fullResponse);
                });

                response.data.on('error', (error: any) => {
                    reject(new Error(`Streaming error: ${error.message}`));
                });
            });
        } else if (response.data) {
            // Handle non-streaming response or browser streaming simulation
            if (response.data.response) {
                // Direct response from Ollama
                return response.data.response;
            } else if (typeof response.data === 'string') {
                // String response (might be from proxy)
                return response.data;
            } else {
                // Handle browser streaming by making a non-streaming request but simulating progress
                if (useStreaming && isBrowser && onProgress) {
                    // For browser, we can't stream directly, so we'll simulate progress
                    // by breaking the response into chunks
                    const fullResponse = response.data.response || JSON.stringify(response.data);
                    const words = fullResponse.split(' ');
                    let accumulatedResponse = '';

                    for (let i = 0; i < words.length; i++) {
                        accumulatedResponse += (i > 0 ? ' ' : '') + words[i];
                        onProgress(words[i] + ' ');

                        // Small delay to simulate streaming
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                    return accumulatedResponse;
                }
                return response.data.response || JSON.stringify(response.data);
            }
        }

        throw new Error('Invalid response from Ollama API');
    } catch (error) {
        logger.error('Error calling Ollama API', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        throw error;
    }
};

export const processUserCommand = async (command: string, context: { userProfile: UserProfile, routines: Routine[] }, onProgress?: (chunk: string) => void): Promise<AiResponse | null> => {
    try {
        const fullPrompt = `${masterPrompt}

Contexto del Usuario:
${JSON.stringify(context, null, 2)}

Comando del Usuario: "${command}"`;

        // Use Ollama with streaming support
        const response = await callOllama(fullPrompt, onProgress);
        return safeJsonParse<AiResponse>(response);
    } catch (error) {
        logger.error('Error processing user command', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return { type: 'response', message: "Lo siento, estoy teniendo problemas para procesar tu solicitud." };
    }
};

export const generateRoutine = async (prompt: string, userProfile: UserProfile): Promise<Omit<Routine, 'id'> | null> => {
    try {
        const fullPrompt = `${plannerPrompt}

Perfil del Usuario:
${JSON.stringify(userProfile, null, 2)}

Petición: "${prompt}"`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<Omit<Routine, 'id'>>(response);
    } catch (error) {
        logger.error('Error generating routine', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const generateReconditioningPlan = async (prompt: string, userProfile: UserProfile): Promise<Omit<ReconditioningPlan, 'id'> | null> => {
    try {
        const fullPrompt = `${reconditioningPrompt}

Perfil del Usuario:
${JSON.stringify(userProfile, null, 2)}

Petición: "${prompt}"`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<Omit<ReconditioningPlan, 'id'>>(response);
    } catch (error) {
        logger.error('Error generating reconditioning plan', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const generateNewCyclePlan = async (userProfile: UserProfile, newPhase: TrainingCycle['phase']): Promise<Omit<Routine, 'id'> | null> => {
    try {
        const prompt = `Mi fase de entrenamiento de '${userProfile.trainingCycle?.phase || 'adaptación'}' ha terminado. Por favor, genera un plan de entrenamiento completo para mi nueva fase de '${newPhase}'. El plan debe durar aproximadamente 4 semanas y estar diseñado como la siguiente etapa lógica en mi progresión. Ten en cuenta todo mi perfil de usuario para diseñarlo.`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(prompt);
        return safeJsonParse<Omit<Routine, 'id'>>(response);
    } catch (error) {
        logger.error('Error generating new cycle plan', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const adaptRoutine = async (routine: Routine, context: 'bodyweight_only' | 'resistance_focus' | 'mental_recovery'): Promise<Omit<Routine, 'id'> | null> => {
    try {
        const fullPrompt = `${routineTranslatorPrompt}

Rutina a adaptar:
${JSON.stringify(routine, null, 2)}

Contexto de Adaptación: "${context}"`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<Omit<Routine, 'id'>>(response);
    } catch (error) {
        logger.error('Error adapting routine', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const generateInitialPlan = async (formData: EvaluationFormData, userName: string): Promise<InitialPlanResponse | null> => {
    try {
        const context = {
            userName,
            evaluationData: formData
        };

        const fullPrompt = `${initialPlanPrompt}

Contexto del Usuario:
${JSON.stringify(context, null, 2)}

Por favor, genera un plan inicial completo con rutina y hábito clave sugerido basado en los datos del usuario. Responde EXCLUSIVAMENTE con un objeto JSON válido que siga el esquema InitialPlanResponse.`;

        // Use Ollama exclusively - removed Google Gemini fallback
        const response = await callOllama(fullPrompt);
        return safeJsonParse<InitialPlanResponse>(response);
    } catch (error) {
        logger.error('Error generating initial plan', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return {
            routine: {
                name: "Plan de Iniciación Spartan (Offline Mode)",
                focus: "Acondicionamiento General",
                duration: 45,
                difficulty: "beginner",
                objective: "Establecer una base sólida de fuerza y movilidad mientras se construye el hábito de entrenamiento.",
                blocks: [
                    {
                        name: "Preparación del Movimiento",
                        type: "warmup",
                        exercises: [
                            { name: "Gato-Vaca", sets: 2, reps: "10", rest: "30s", description: "Moviliza la columna vertebral." },
                            { name: "Sentadilla Isométrica", sets: 2, reps: "30s", rest: "30s", description: "Activa piernas y core." }
                        ]
                    },
                    {
                        name: "Fuerza Principal",
                        type: "strength",
                        exercises: [
                            { name: "Sentadilla con Peso Corporal", sets: 3, reps: "12-15", rest: "60s", description: "Foco en técnica y profundidad." },
                            { name: "Flexiones (o rodillas)", sets: 3, reps: "8-12", rest: "60s", description: "Mantén el cuerpo en línea recta." },
                            { name: "Remo Invertido (o con banda)", sets: 3, reps: "10-12", rest: "60s", description: "Tracción horizontal para espalda." }
                        ]
                    },
                    {
                        name: "Vuelta a la Calma",
                        type: "cooldown",
                        exercises: [
                            { name: "Estiramiento de Flexores de Cadera", sets: 2, reps: "30s/lado", rest: "0", description: "Relaja la cadera tras las sentadillas." }
                        ]
                    }
                ]
            },
            keystoneHabitSuggestion: {
                name: "Hidratación Estratégica",
                description: "Bebe 500ml de agua con una pizca de sal mineral al despertar para rehidratar el cuerpo y mejorar la función cognitiva.",
                frequency: "daily",
                anchor: "Inmediatamente después de apagar la alarma",
                targetStreak: 7,
                impact: "high"
            }
        } as InitialPlanResponse;
    }
};

export const getFormFeedbackFromVideo = async (exerciseName: string, videoBase64: string, mimeType: string): Promise<string> => {
    logger.info('getFormFeedbackFromVideo called', {
        context: 'ai-service',
        metadata: {
            exerciseName,
            mimeType,
            base64Length: videoBase64.length
        }
    });
    // Mocking the response as direct video analysis is not straightforward with the available APIs and guidelines.
    // A real implementation would require a different approach, possibly involving frame extraction.
    return new Promise((resolve) => {
        setTimeout(() => {
            const tips = [
                `Para ${exerciseName}, asegúrate de mantener el core apretado para estabilizar la columna. Un tronco firme es la base de un movimiento seguro y potente.`,
                `En ${exerciseName}, concéntrate en un rango de movimiento completo y controlado. Evita los movimientos bruscos; la calidad supera a la cantidad.`,
                `Al realizar ${exerciseName}, recuerda controlar la fase excéntrica (el descenso). Bajar el peso lentamente aumenta el tiempo bajo tensión y puede mejorar las ganancias de fuerza.`
            ];
            resolve(tips[Math.floor(Math.random() * tips.length)]);
        }, 2000);
    });
};

type OracleTask = 'generate-quest-prompt' | 'define-quest' | 'generate-milestones' | 'weekly-divination';

export const getOracleResponse = async (task: OracleTask, userProfile: UserProfile, payload: any): Promise<any> => {
    try {
        const context = { userProfile, ...payload };
        const fullPrompt = `${oraclePrompt}

Tarea: \`${task}\`

Contexto:
${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);

        if (task === 'generate-milestones') {
            const parsed = safeJsonParse<Omit<Milestone, 'id' | 'isCompleted'>[]>(response);
            return parsed?.map((m, i) => ({ ...m, id: `m-${Date.now()}-${i}`, isCompleted: false })) || [];
        } else {
            return response;
        }
    } catch (error) {
        logger.error('Error with Oracle task', {
            context: 'ai-service',
            metadata: {
                task,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "El Oráculo guarda silencio. Inténtalo de nuevo más tarde.";
    }
};

export const getStrategistTip = async (userProfile: UserProfile, synergisticLoadScore: number): Promise<string> => {
    try {
        const context = { userProfile, synergisticLoadScore };
        const fullPrompt = `${strategistPrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return response;
    } catch (error) {
        logger.error('Error getting strategist tip', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "La estrategia de hoy es simple: escucha a tu cuerpo y da lo mejor de ti.";
    }
}

export const getWeeklyCheckInFeedback = async (userProfile: UserProfile, checkIns: WeeklyCheckIn[]): Promise<string> => {
    try {
        const context = { userProfile, weeklyCheckIns: checkIns.slice(-2) }; // Provide last two check-ins for trend analysis
        const fullPrompt = `${adaptationPrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return response;
    } catch (error) {
        logger.error('Error getting weekly check-in feedback', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "Hubo un problema al analizar tu progreso. Consejo general: si te sientes bien, intenta aumentar ligeramente los pesos. Si te sientes cansado, céntrate en la técnica y la recuperación.";
    }
}

export const getSuccessManual = async (context: any): Promise<string> => {
    try {
        const fullPrompt = `${successManualPrompt}\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return response;
    } catch (error) {
        logger.error('Error getting success manual', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "Error al generar el manual. El Cronista necesita más tiempo para descifrar tus hazañas.";
    }
};

export const getChronotypeAnalysis = async (answers: string[]): Promise<ChronotypeAnalysis | null> => {
    try {
        const payload = {
            question1: answers[0],
            question2: answers[1],
            question3: answers[2],
            question4: answers[3],
        };
        const fullPrompt = `${chronotypePrompt}\n\nRespuestas del Usuario:\n${JSON.stringify(payload, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<ChronotypeAnalysis>(response);
    } catch (error) {
        logger.error('Error getting chronotype analysis', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const getFailureReframing = async (
    userProfile: UserProfile,
    failureContext: { type: 'nutrition' | 'recovery', score: number }
): Promise<{ reframedMessage: string; microAction: string } | null> => {
    try {
        const context = { userProfile, failureContext };
        const fullPrompt = `${reframingPrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<{ reframedMessage: string; microAction: string }>(response);
    } catch (error) {
        logger.error('Error getting failure reframing', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

// export const getNutritionPlan = async (userProfile: UserProfile): Promise<NutritionPlan | null> => {
//     try {
//         const fullPrompt = `${nutritionistPrompt}\n\nContexto del Usuario:\n${JSON.stringify(userProfile, null, 2)}`;
//         
//         // Use Ollama instead of Google Gemini
//         const response = await callOllama(fullPrompt);
//         return safeJsonParse<NutritionPlan>(response);
//     } catch (error) {
//         console.error("Error getting nutrition plan:", error);
//         return null;
//     }
// };

// export const getPainManagementProtocol = async (
//     painArea: string, 
//     painDescription: string, 
//     userProfile: UserProfile
// ): Promise<PrehabProtocol | null> => {
//     try {
//         const context = {
//             userProfile,
//             discomfortReport: {
//                 area: painArea,
//                 description: painDescription
//             }
//         };
//         const fullPrompt = `${prehabPrompt}\n\nContexto del Usuario:\n${JSON.stringify(context, null, 2)}`;
//         
//         // Use Ollama instead of Google Gemini
//         const response = await callOllama(fullPrompt);
//         return safeJsonParse<PrehabProtocol>(response);
//     } catch (error) {
//         console.error("Error getting pain management protocol:", error);
//         return null;
//     }
// };

export const getResilienceAnalysis = async (
    query: string,
    context: {
        userProfile: UserProfile;
        workoutHistory: WorkoutHistory[];
        dailyLogs: DailyLog[];
        habitLogs: HabitLog[];
        weeklyCheckIns: WeeklyCheckIn[];
    }
): Promise<string> => {
    try {
        const fullPrompt = `${resilienceAnalystPrompt}

CONTEXTO DEL USUARIO (DATOS HISTÓRICOS):
${JSON.stringify(context, null, 2)}

PREGUNTA DEL USUARIO: "${query}"`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return response;
    } catch (error) {
        logger.error('Error getting resilience analysis', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "Lo siento, no pude analizar tus datos en este momento. Inténtalo de nuevo.";
    }
};

// export const getCycleReview = async (
//     userProfile: UserProfile,
//     workoutHistory: WorkoutHistory[],
//     habitLogs: HabitLog[]
// ): Promise<CycleReviewResponse | null> => {
//     try {
//         const cycleStartDate = userProfile.trainingCycle?.startDate;
//         if (!cycleStartDate) return null;
// 
//         // Filter history for the current cycle
//         const cycleWorkouts = workoutHistory.filter(h => h.date >= cycleStartDate);
//         const cycleHabitLogs = habitLogs.filter(h => h.date >= cycleStartDate);
// 
//         const context = {
//             userProfile,
//             cycleData: {
//                 workoutHistory: cycleWorkouts,
//                 habitLogs: cycleHabitLogs,
//             }
//         };
// 
//         const fullPrompt = `${cyclicalReviewPrompt}\n\nContexto del Ciclo del Usuario:\n${JSON.stringify(context, null, 2)}`;
//         
//         // Use Ollama instead of Google Gemini
//         const response = await callOllama(fullPrompt);
//         return safeJsonParse<CycleReviewResponse>(response);
//     } catch (error) {
//         console.error("Error getting cycle review:", error);
//         return null;
//     }
// };

export const getPeriodizationGuardFeedback = async (
    currentSchedule: { date: string, focus: string }[],
    movedWorkout: { date: string, focus: string },
    targetDate: string
): Promise<string> => {
    try {
        const context = { currentSchedule, movedWorkout, targetDate };
        const fullPrompt = `${periodizationGuardPrompt}\n\nContexto del Cambio:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return response.trim();
    } catch (error) {
        logger.error('Error getting periodization guard feedback', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return "Hubo un problema al analizar el cambio. Procede con precaución.";
    }
};

export const recalculateScheduleForInterruption = async (
    currentSchedule: ScheduledWorkout[],
    routines: Routine[],
    interruptedDate: string
): Promise<RecalculateResponse | null> => {
    try {
        const scheduleWithFocus = currentSchedule.map(sw => ({
            date: sw.date,
            routineId: sw.routineId,
            focus: routines.find(r => r.id === sw.routineId)?.focus || 'Unknown'
        }));

        const context = {
            currentSchedule: scheduleWithFocus,
            interruptedDate,
        };
        const fullPrompt = `${restructureSchedulePrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<RecalculateResponse>(response);
    } catch (error) {
        logger.error('Error recalculating schedule', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const compensateForSkippedWorkout = async (
    skippedRoutine: Routine,
    nextRoutine: Routine
): Promise<Omit<Routine, 'id'> | null> => {
    try {
        const context = { skippedRoutine, nextRoutine };
        const fullPrompt = `${compensationPrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<Omit<Routine, 'id'>>(response);
    } catch (error) {
        logger.error('Error compensating for skipped workout', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};

export const adjustRoutineForTime = async (
    routine: Routine,
    availableTime: number
): Promise<Omit<Routine, 'id'> | null> => {
    try {
        const context = { routine, availableTime };
        const fullPrompt = `${timeAdjustmentPrompt}\n\nContexto:\n${JSON.stringify(context, null, 2)}`;

        // Use Ollama instead of Google Gemini
        const response = await callOllama(fullPrompt);
        return safeJsonParse<Omit<Routine, 'id'>>(response);
    } catch (error) {
        logger.error('Error adjusting routine for time', {
            context: 'ai-service',
            metadata: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        return null;
    }
};