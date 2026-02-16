import type { ExerciseDetail } from '../types.ts';

export const EXERCISE_LIBRARY: ExerciseDetail[] = [
    {
        id: 'ex_001',
        name: 'Sentadilla con Barra',
        muscleGroups: ['Cuádriceps', 'Glúteos', 'Isquiotibiales', 'Core'],
        equipment: 'Barra, Rack',
        instructions: [
            "Coloca la barra sobre tus trapecios, no sobre tu cuello.",
            "Mantén el pecho erguido y el core apretado.",
            "Inicia el movimiento empujando las caderas hacia atrás, como si te sentaras en una silla.",
            "Baja hasta que tus caderas estén al menos paralelas al suelo.",
            "Empuja el suelo con todo el pie para volver a la posición inicial."
        ],
        biomechanicsFocus: "Activa tu core como si te prepararas para recibir un golpe (bracing). Piensa en 'atornillar' tus pies en el suelo para crear tensión en las caderas y estabilizar la rodilla.",
        injuryModifications: {
            'rodilla_pain': {
                modification: 'Sentadilla a Caja',
                reason: 'Limita el rango de movimiento a un punto seguro y controlado, reduciendo el estrés en la articulación de la rodilla.'
            },
            'espalda_pain': {
                modification: 'Sentadilla Goblet',
                reason: 'La carga frontal promueve una postura más erguida, reduciendo la tensión en la espalda baja.'
            }
        },
        deviation: {
            animationName: 'Squat_KneeValgus',
            highlightPart: 'Rodilla' // Matches part of the mesh name e.g., 'Knee_L', 'Knee_R'
        },
        suggestedView: 'frontal'
    },
    {
        id: 'ex_002',
        name: 'Peso Muerto Convencional',
        muscleGroups: ['Isquiotibiales', 'Glúteos', 'Espalda Baja', 'Trapecios'],
        equipment: 'Barra',
        instructions: [
            "Párate con los pies a la anchura de las caderas, con la barra sobre el mediopié.",
            "Flexiona las caderas y rodillas para agarrar la barra, manteniendo la espalda recta.",
            "Inicia el levantamiento extendiendo las rodillas y caderas simultáneamente.",
            "Mantén la barra cerca de tu cuerpo en todo momento.",
            "Finaliza el movimiento erguido, con las caderas completamente extendidas. Invierte el movimiento de forma controlada."
        ],
        biomechanicsFocus: "Antes de levantar, toma una gran bocanada de aire y activa tu core 360 grados (bracing) para crear un cinturón de fuerza natural. Inicia el levantamiento 'empujando el suelo' con los pies.",
        injuryModifications: {
            'espalda_pain': {
                modification: 'Peso Muerto Rumano con Mancuernas',
                reason: 'Permite un mayor control y un rango de movimiento más corto, enfocándose en los isquiotibiales con menos carga en la zona lumbar.'
            }
        }
    },
    {
        id: 'ex_003',
        name: 'Press de Banca con Barra',
        muscleGroups: ['Pectoral', 'Tríceps', 'Deltoides Anterior'],
        equipment: 'Barra, Banca',
        instructions: [
            "Acuéstate en la banca con los pies firmes en el suelo.",
            "Retrae las escápulas (junta los omóplatos) para crear una base estable.",
            "Agarra la barra con una anchura ligeramente superior a la de los hombros.",
            "Baja la barra de forma controlada hasta el esternón.",
            "Empuja la barra hacia arriba y ligeramente hacia atrás, contrayendo el pectoral."
        ],
        biomechanicsFocus: "Imagina que intentas 'doblar la barra' en forma de U. Activa los glúteos y el core (bracing) para crear tensión en todo el cuerpo, transfiriendo más fuerza al levantamiento.",
        injuryModifications: {
            'hombro_pain': {
                modification: 'Press de Banca con Mancuernas (Agarre Neutro)',
                reason: 'El agarre neutro y el movimiento independiente de las mancuernas reducen el pinzamiento en la articulación del hombro.'
            }
        }
    },
    {
        id: 'ex_004',
        name: 'Sentadilla Goblet',
        muscleGroups: ['Cuádriceps', 'Glúteos', 'Core'],
        equipment: 'Mancuerna o Kettlebell',
        instructions: [
            "Sostén una mancuerna verticalmente contra tu pecho.",
            "Mantén una postura erguida durante todo el movimiento.",
            "Baja las caderas hacia atrás y hacia abajo, manteniendo las rodillas alineadas con los pies.",
            "Vuelve a la posición inicial empujando a través de los talones."
        ],
        biomechanicsFocus: "Usa la mancuerna como contrapeso para ayudarte a mantener el torso lo más vertical posible. El propio peso te obliga a mantener el core activado (bracing).",
        injuryModifications: {}
    },
    {
        id: 'ex_005',
        name: 'Sentadilla a Caja',
        muscleGroups: ['Cuádriceps', 'Glúteos', 'Isquiotibiales'],
        equipment: 'Barra, Rack, Caja o Banca',
        instructions: [
            "Configura una caja o banca a una altura que no te cause dolor en la rodilla.",
            "Realiza una sentadilla controlada hasta que tus glúteos toquen suavemente la caja.",
            "Haz una pausa de un segundo en la caja, manteniendo la tensión.",
            "Asciende explosivamente desde la caja hasta la posición inicial."
        ],
        biomechanicsFocus: "Concéntrate en el control excéntrico al bajar a la caja, evitando 'caer' el último tramo. Mantén el core activado (bracing) incluso durante la pausa.",
        injuryModifications: {}
    },
    {
        id: 'ex_006',
        name: 'Peso Muerto Rumano con Mancuernas',
        muscleGroups: ['Isquiotibiales', 'Glúteos'],
        equipment: 'Mancuernas',
        instructions: [
            "Sostén una mancuerna en cada mano, de pie y erguido.",
            "Con una ligera flexión de rodillas, empuja las caderas hacia atrás, bajando las mancuernas por delante de tus piernas.",
            "Mantén la espalda recta y baja hasta que sientas un estiramiento profundo en los isquiotibiales.",
            "Contrae los glúteos para volver a la posición inicial."
        ],
        biomechanicsFocus: "Imagina que tus caderas son una bisagra, enfocándote en el movimiento hacia atrás en lugar de hacia abajo. Mantén un core firme (bracing) para proteger tu espalda baja.",
        injuryModifications: {}
    },
     {
        id: 'ex_007',
        name: 'Press de Banca con Mancuernas (Agarre Neutro)',
        muscleGroups: ['Pectoral', 'Tríceps', 'Deltoides Anterior'],
        equipment: 'Mancuernas, Banca',
        instructions: [
            "Acuéstate en la banca con una mancuerna en cada mano, palmas enfrentadas.",
            "Mantén los pies firmes en el suelo y las escápulas retraídas.",
            "Baja las mancuernas de forma controlada hasta los lados de tu pecho.",
            "Empuja hacia arriba hasta extender completamente los codos."
        ],
        biomechanicsFocus: "Controla el descenso (fase excéntrica) durante 3 segundos para maximizar la tensión en el pectoral. Activa tu core (bracing) para una mayor estabilidad.",
        injuryModifications: {}
    },
     {
        id: 'ex_008',
        name: 'Zancadas',
        muscleGroups: ['Cuádriceps', 'Glúteos'],
        equipment: 'Peso corporal o Mancuernas',
        instructions: [
            "Da un paso hacia adelante con una pierna, manteniendo el torso erguido.",
            "Baja las caderas hasta que ambas rodillas estén flexionadas a 90 grados.",
            "Asegúrate de que la rodilla delantera no sobrepase el tobillo.",
            "Empuja con el pie delantero para volver a la posición inicial."
        ],
        biomechanicsFocus: "Concéntrate en empujar verticalmente con la pierna delantera, en lugar de impulsarte hacia atrás. Mantén el core activado (bracing) para evitar que el torso se incline.",
         injuryModifications: {
            'rodilla_pain': {
                modification: 'Zancada Inversa',
                reason: 'Dar el paso hacia atrás reduce las fuerzas de cizallamiento en la rodilla delantera.'
            }
        }
    },
    {
        id: 'ex_009',
        name: 'Zancada Inversa',
        muscleGroups: ['Cuádriceps', 'Glúteos'],
        equipment: 'Peso corporal o Mancuernas',
        instructions: [
            "Desde una posición de pie, da un gran paso hacia atrás con una pierna.",
            "Baja las caderas hasta que la rodilla trasera casi toque el suelo.",
            "Mantén el torso erguido y el peso en el talón del pie delantero.",
            "Empuja con el pie delantero para volver a la posición inicial."
        ],
        biomechanicsFocus: "Inicia el movimiento desde la cadera de la pierna trasera, manteniendo la estabilidad en la pierna delantera y el core firme (bracing).",
        injuryModifications: {}
    },
    {
        id: 'ex_010',
        name: 'Pike Push-ups',
        muscleGroups: ['Deltoides', 'Tríceps', 'Pectoral Superior'],
        equipment: 'Peso corporal',
        instructions: [
            "Comienza en una posición de V invertida, con las caderas altas y el cuerpo formando un ángulo.",
            "Coloca las manos un poco más anchas que los hombros.",
            "Baja la cabeza hacia el suelo, manteniendo las caderas altas.",
            "Empuja hacia arriba para volver a la posición inicial."
        ],
        biomechanicsFocus: "Concéntrate en mantener la posición de V invertida. A medida que bajas, tus codos deben apuntar hacia atrás, no hacia los lados.",
        injuryModifications: {
            'hombro_pain': {
                modification: 'Flexiones Inclinadas',
                reason: 'Reduce la carga en los hombros al cambiar el ángulo del cuerpo.'
            }
        }
    },
    {
        id: 'ex_011',
        name: 'Hollow Body Hold',
        muscleGroups: ['Core', 'Abdominales'],
        equipment: 'Peso corporal',
        instructions: [
            "Acuéstate boca arriba con los brazos extendidos por encima de la cabeza y las piernas rectas.",
            "Contrae el abdomen, presionando la parte baja de la espalda contra el suelo.",
            "Levanta lentamente los hombros y las piernas del suelo, manteniendo la espalda baja pegada al suelo.",
            "Sostén la posición, manteniendo la tensión en todo el cuerpo."
        ],
        biomechanicsFocus: "El objetivo es eliminar cualquier espacio entre tu espalda baja y el suelo. Si se arquea, reduce la palanca acercando las rodillas y los brazos al cuerpo.",
        injuryModifications: {}
    },
    {
        id: 'ex_012',
        name: 'Flexiones',
        muscleGroups: ['Pectoral', 'Tríceps', 'Deltoides Anterior', 'Core'],
        equipment: 'Peso corporal',
        instructions: [
            "Coloca las manos ligeramente más anchas que los hombros, manteniendo el cuerpo en línea recta desde la cabeza hasta los talones.",
            "Baja el cuerpo de forma controlada hasta que el pecho casi toque el suelo.",
            "Mantén los codos en un ángulo de aproximadamente 45-75 grados con respecto a tu cuerpo.",
            "Empuja con fuerza para volver a la posición inicial."
        ],
        biomechanicsFocus: "Activa tu core como si te prepararas para recibir un golpe (bracing). Esto protege tu columna y transfiere la fuerza de manera más eficiente.",
        injuryModifications: {
             'hombro_pain': {
                modification: 'Flexiones Inclinadas',
                reason: 'Reduce la carga sobre la articulación del hombro al disminuir la cantidad de peso corporal que se levanta.'
            }
        }
    }
];
