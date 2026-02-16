/**
 * Sample Knowledge Base Dataset
 * Real fitness and biology book excerpts for Phase 7.2 population
 */

export const sampleBooks = [
  {
    id: "starting-strength-rippetoe",
    title: "Starting Strength",
    authors: ["Mark Rippetoe"],
    year: 2007,
    isbn: "978-0982522455",
    category: "Strength & Conditioning",
    description: "A practical guide to weight training for all ages",
    chapters: [
      {
        number: 1,
        title: "Barbell Training Basics",
        content: `The barbell is the most efficient tool available for the development of functional strength. 
        It allows the application of force through a longer range of motion than any other implement, and it 
        permits a wider range of loading parameters than any other tool. This efficiency makes the barbell 
        ideally suited for the purpose of strength training. The squat, bench press, and deadlift are the 
        three primary barbell movements that form the foundation of any serious strength training program. 
        These movements train the entire body, work the largest muscle masses, and produce the greatest 
        hormonal response to training.`
      },
      {
        number: 2,
        title: "Recovery and Adaptation",
        content: `Recovery from training stress is essential for adaptation to occur. Without adequate recovery, 
        the body cannot adapt to the stimulus provided by training. Sleep is the most important factor in 
        recovery. During sleep, the body releases growth hormone and completes protein synthesis. Inadequate 
        sleep will reduce training adaptation and increase injury risk. Adults should aim for 7-9 hours of 
        quality sleep per night. Nutrition is also critical for recovery. Protein intake should be adequate 
        to support muscle protein synthesis. Carbohydrate intake should be sufficient to replenish glycogen 
        stores depleted during training.`
      },
      {
        number: 3,
        title: "Progressive Overload",
        content: `Progressive overload is the principle of gradually increasing the demands on the body during 
        exercise. This is the fundamental stimulus for adaptation. Without progression, the body adapts to 
        the current stimulus and stops improving. Progression can be achieved by increasing weight, 
        increasing reps, decreasing rest periods, or improving technique. The most important factor is 
        consistency. Small, consistent increases over time lead to significant improvements. This is why 
        linear periodization works so well for novice lifters.`
      }
    ]
  },
  {
    id: "why-we-sleep-walker",
    title: "Why We Sleep",
    authors: ["Matthew Walker"],
    year: 2017,
    isbn: "978-0743286816",
    category: "Recovery & Sleep Science",
    description: "Understanding sleep for better health and performance",
    chapters: [
      {
        number: 1,
        title: "The Science of Sleep",
        content: `Sleep is not a single state but rather a complex orchestration of different brain states. 
        During a night of sleep, we cycle through non-REM and REM sleep stages approximately every 90 minutes. 
        Non-REM sleep is divided into three stages, with increasing depth. During deep sleep, the brain 
        produces large, slow delta waves. This is when physical restoration occurs. REM sleep is when most 
        dreaming happens and is crucial for emotional processing and memory consolidation. Both types are 
        essential for health.`
      },
      {
        number: 2,
        title: "Sleep and Athletic Performance",
        content: `Sleep deprivation has profound effects on athletic performance. Even a single night of poor 
        sleep reduces athletic performance by 10-20%. Consistent sleep deprivation leads to declining 
        performance over time. Sleep improves muscle recovery through growth hormone release and protein 
        synthesis. Athletes should prioritize sleep as much as training. Professional athletes often nap 
        during the day to ensure adequate total sleep. Sleep is when the brain consolidates skills and 
        memory, so sleep deprivation impairs learning new techniques.`
      },
      {
        number: 3,
        title: "Sleep Hygiene",
        content: `Consistent sleep schedules help regulate the circadian rhythm. Going to bed and waking up 
        at the same time daily improves sleep quality. Cool, dark, quiet environments promote better sleep. 
        Temperature should be around 65-68 degrees Fahrenheit. Blue light exposure before sleep disrupts 
        melatonin production. Caffeine can persist in the body for 5+ hours, so avoid it after 2 PM. 
        Alcohol disrupts sleep architecture despite initial drowsiness.`
      }
    ]
  },
  {
    id: "nutrition-science-sports",
    title: "Sports Nutrition Science",
    authors: ["Karen Birch", "David Mackintosh"],
    year: 2014,
    isbn: "978-0415530231",
    category: "Nutrition & Performance",
    description: "Scientific approaches to athletic nutrition",
    chapters: [
      {
        number: 1,
        title: "Macronutrient Metabolism",
        content: `Carbohydrates are the primary fuel source for high-intensity exercise. Glycogen stored in 
        muscles and liver provides immediate energy. Once glycogen depletes, performance drops significantly. 
        Protein is essential for muscle repair and adaptation. Amino acid availability after training 
        stimulates muscle protein synthesis. Fat serves as an energy source during lower-intensity activity 
        and supports hormone production. A balanced approach utilizing all macronutrients is optimal for 
        athletic performance.`
      },
      {
        number: 2,
        title: "Nutrient Timing",
        content: `The window around training is critical for nutrition. Pre-training meals should provide 
        carbohydrates and moderate protein 2-3 hours before exercise. Post-training, consume carbohydrates 
        and protein within 30-60 minutes to maximize muscle protein synthesis. The ratio of carbohydrates 
        to protein should be approximately 3:1 to 4:1. Total daily caloric intake matters more than exact 
        timing, but peaking nutrition around training optimizes adaptation.`
      },
      {
        number: 3,
        title: "Hydration Strategy",
        content: `Dehydration of even 2% body weight impairs exercise performance and temperature regulation. 
        During exercise, aim to drink 200-300 ml of fluid every 15-20 minutes. For activities exceeding 
        90 minutes, sports drinks containing 4-8% carbohydrates and electrolytes improve performance. 
        Post-exercise rehydration should include sodium to enhance fluid retention. Individual sweat rates 
        vary greatly, so personalized hydration strategies are important.`
      }
    ]
  },
  {
    id: "roar-women-athletes-sims",
    title: "Roar: How to Match Your Food and Fitness to Your Female Physiology",
    authors: ["Stacy Sims"],
    year: 2016,
    isbn: "978-0062334404",
    category: "Women's Physiology",
    description: "Evidence-based nutrition and training for women athletes",
    chapters: [
      {
        number: 1,
        title: "Female Physiology Basics",
        content: `Women have unique physiological characteristics that affect training and nutrition. 
        Hormonal fluctuations throughout the menstrual cycle impact energy availability and injury risk. 
        Women have naturally lower testosterone, affecting muscle building capacity. Women are better at 
        utilizing fat as fuel. Women may have different hydration needs and sweat rates than men. 
        Understanding these differences allows for optimization of training and nutrition strategies.`
      },
      {
        number: 2,
        title: "Training Across the Cycle",
        content: `The menstrual cycle has two distinct phases: follicular and luteal. The follicular phase 
        has lower hormone levels and better carbohydrate utilization. This is ideal for high-intensity 
        training. The luteal phase has elevated progesterone and increased body temperature. Higher calories 
        are needed as metabolic rate increases by 100-300 calories per day. Intensity should be adjusted 
        during the luteal phase to prevent overtraining.`
      },
      {
        number: 3,
        title: "Nutrition for Female Athletes",
        content: `Women athletes need adequate iron due to menstrual losses. Iron-rich foods like red meat, 
        spinach, and legumes should be included regularly. Calcium and vitamin D are important for bone 
        health. Women are at higher risk for relative energy deficiency in sports. Adequate calories 
        throughout the cycle are essential. Periodic assessment of nutritional status is recommended.`
      }
    ]
  },
  {
    id: "periodization-training-bompa",
    title: "Periodization: Theory and Methodology of Training",
    authors: ["Tudor Bompa", "Gregory Haff"],
    year: 2009,
    isbn: "978-0736074636",
    category: "Periodization & Theory",
    description: "Comprehensive guide to periodized training",
    chapters: [
      {
        number: 1,
        title: "Periodization Principles",
        content: `Periodization is the planned variation of training stimulus to optimize adaptation while 
        preventing plateaus. The training year is divided into macrocycles (full year), mesocycles (4-12 weeks), 
        and microcycles (1-2 weeks). Each period emphasizes different qualities: strength, power, hypertrophy, 
        and endurance. Linear periodization increases intensity while decreasing volume. Undulating periodization 
        varies these within each week. Block periodization focuses on one quality at a time.`
      },
      {
        number: 2,
        title: "Macrocycle Planning",
        content: `Annual planning ensures systematic progression toward peak performance. Preparation phase 
        builds general qualities. Competition phase emphasizes specific qualities. Transition phase allows 
        recovery. The length and emphasis of each phase depends on sport demands. Peaking typically occurs 
        4-6 weeks before the main competition. Periodization prevents overtraining and optimizes the 
        neuroendocrine system.`
      },
      {
        number: 3,
        title: "Fatigue Management",
        content: `Accumulation of training stress without adequate recovery leads to overtraining syndrome. 
        Deload periods are essential for adaptation. A typical deload reduces volume by 40-50% while 
        maintaining intensity. Deloads should occur every 4-6 weeks. Individual response to training varies, 
        so monitoring recovery markers is important. Heart rate variability, sleep quality, and subjective 
        feeling can indicate recovery status.`
      }
    ]
  }
];
