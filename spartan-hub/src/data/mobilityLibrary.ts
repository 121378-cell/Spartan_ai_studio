import type { MobilityTest, MobilityDrill, MobilityIssue } from '../types.ts';

export const MOBILITY_TESTS: MobilityTest[] = [
    {
        id: 'mt_001',
        name: 'Test de Sentadilla Profunda (Dorsiflexión de Tobillo)',
        instructions: [
            "Párate con los pies a la anchura de los hombros, dedos apuntando ligeramente hacia afuera.",
            "Extiende los brazos rectos frente a ti, paralelos al suelo.",
            "Baja en una sentadilla tan profundo como puedas, manteniendo el torso lo más erguido posible.",
            "Intenta mantener los talones pegados al suelo en todo momento."
        ],
        passCriteria: "Puedes bajar hasta que tus caderas estén por debajo de tus rodillas, con el torso relativamente erguido y los talones en el suelo.",
        failCriteria: "Los talones se levantan del suelo, o no puedes bajar las caderas por debajo de las rodillas sin perder el equilibrio o inclinarte excesivamente hacia adelante.",
        associatedIssue: 'tobillo'
    },
    {
        id: 'mt_002',
        name: 'Test de Movilidad de Hombro',
        instructions: [
            "Párate erguido y haz un puño con cada mano, con el pulgar dentro de los dedos.",
            "Simultáneamente, lleva un brazo por encima del hombro y por detrás de la espalda, como si trataras de rascarte la espalda.",
            "Lleva el otro brazo por debajo y por detrás de la espalda, intentando tocar el puño superior.",
            "Observa la distancia entre tus puños. Repite en el otro lado."
        ],
        passCriteria: "Tus puños están a una distancia de no más de una mano y media de separación.",
        failCriteria: "Tus puños están a más de una mano y media de distancia.",
        associatedIssue: 'hombro'
    },
    {
        id: 'mt_003',
        name: 'Test de Thomas (Flexores de Cadera)',
        instructions: [
            "Siéntate en el borde de una banca o cama resistente.",
            "Acuéstate boca arriba, llevando ambas rodillas hacia tu pecho.",
            "Abraza una rodilla firmemente contra tu pecho.",
            "Lentamente, baja la otra pierna, dejándola colgar libremente hacia el suelo."
        ],
        passCriteria: "La parte posterior de tu muslo (isquiotibial) de la pierna extendida toca la superficie de la banca.",
        failCriteria: "Tu muslo no toca la banca, o tu rodilla se extiende involuntariamente para compensar.",
        associatedIssue: 'cadera'
    },
    {
        id: 'mt_004',
        name: 'Test de Ángel en la Pared (Movilidad Torácica)',
        instructions: [
            "Párate de espaldas a una pared, con los talones, glúteos y omóplatos tocándola.",
            "Lleva tus brazos a una posición de 'cactus' (90 grados en hombros y codos), con el dorso de tus manos y codos contra la pared.",
            "Lentamente, intenta deslizar tus brazos hacia arriba por la pared, manteniendo el contacto de espalda, codos y muñecas.",
            "Desliza hacia arriba y hacia abajo."
        ],
        passCriteria: "Puedes mantener el contacto de la espalda baja, los codos y las muñecas con la pared durante la mayor parte del movimiento.",
        failCriteria: "Tu espalda baja se arquea excesivamente para mantener el contacto, o tus codos o muñecas se separan de la pared.",
        associatedIssue: 'toracica'
    }
];

export const MOBILITY_DRILLS: MobilityDrill[] = [
    {
        id: 'md_001',
        name: 'Círculos de Tobillo',
        description: '15 círculos por lado',
        addresses: ['tobillo']
    },
    {
        id: 'md_002',
        name: 'Estiramiento de Gemelos en Pared',
        description: '30 segundos por lado',
        addresses: ['tobillo']
    },
    {
        id: 'md_003',
        name: 'Dislocaciones de Hombro con Banda',
        description: '15 repeticiones lentas',
        addresses: ['hombro', 'toracica']
    },
    {
        id: 'md_004',
        name: 'Estiramiento del Gato-Camello',
        description: '10 repeticiones lentas',
        addresses: ['toracica', 'cadera']
    },
    {
        id: 'md_005',
        name: 'Rotaciones Torácicas en Cuadrupedia',
        description: '10 por lado',
        addresses: ['toracica']
    },
     {
        id: 'md_006',
        name: 'Estiramiento 90/90 de Cadera',
        description: '30 segundos por lado',
        addresses: ['cadera']
    }
];

export const EXERCISE_MOBILITY_MAP: Record<string, MobilityIssue[]> = {
    'sentadilla': ['tobillo', 'cadera'],
    'peso muerto': ['cadera', 'toracica'],
    'press': ['hombro', 'toracica'],
    'remo': ['hombro', 'toracica'],
    'zancada': ['tobillo', 'cadera'],
};

