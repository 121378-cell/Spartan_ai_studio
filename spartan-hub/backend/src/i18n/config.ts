import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';
import * as HttpMiddleware from 'i18next-http-middleware';

// Define supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language resources
export const resources = {
  en: {
    translation: {
      // General
      welcome: 'Welcome to Spartan Hub',
      greeting: 'Hello {{name}}!',
      goodbye: 'Goodbye',

      // Authentication
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      loginSuccess: 'Successfully logged in',
      logoutSuccess: 'Successfully logged out',
      logoutAllSuccess: 'All sessions logged out successfully',
      registerSuccess: 'Account created successfully',
      invalidCredentials: 'Invalid credentials',
      emailAlreadyExists: 'User with this email already exists',
      unauthorized: 'Unauthorized access',
      insufficientPermissions: 'Insufficient permissions',
      userNotFound: 'User not found',
      updateUserFailed: 'Failed to update user',
      userRoleUpdated: 'User role updated successfully',
      invalidRole: 'Invalid role',

      // Navigation
      dashboard: 'Dashboard',
      profile: 'Profile',
      settings: 'Settings',
      workouts: 'Workouts',
      nutrition: 'Nutrition',
      community: 'Community',

      // Errors
      error: 'Error',
      notFound: 'Page not found',
      serverError: 'Server error occurred',

      // Success messages

      // Validation
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email',
      passwordTooShort: 'Password must be at least 8 characters',

      // User profile
      name: 'Name',
      age: 'Age',
      weight: 'Weight',
      height: 'Height',
      goal: 'Goal',

      // Workouts
      myWorkouts: 'My Workouts',
      createWorkout: 'Create Workout',
      workoutName: 'Workout Name',
      duration: 'Duration',
      exercises: 'Exercises',

      // Nutrition
      myNutrition: 'My Nutrition',
      dailyCalories: 'Daily Calories',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',

      // Settings
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      privacy: 'Privacy',

      // Buttons
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      submit: 'Submit'
    }
  },
  es: {
    translation: {
      // General
      welcome: 'Bienvenido a Spartan Hub',
      greeting: '¡Hola {{name}}!',
      goodbye: 'Adiós',

      // Authentication
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      register: 'Registrarse',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      loginSuccess: 'Inicio de sesión exitoso',
      logoutSuccess: 'Cierre de sesión exitoso',
      logoutAllSuccess: 'Todas las sesiones cerradas exitosamente',
      registerSuccess: 'Cuenta creada exitosamente',
      invalidCredentials: 'Credenciales inválidas',
      emailAlreadyExists: 'Ya existe un usuario con este correo electrónico',
      unauthorized: 'Acceso no autorizado',
      insufficientPermissions: 'Permisos insuficientes',
      userNotFound: 'Usuario no encontrado',
      updateUserFailed: 'Error al actualizar el usuario',
      userRoleUpdated: 'Rol de usuario actualizado exitosamente',
      invalidRole: 'Rol inválido',

      // Navigation
      dashboard: 'Panel de control',
      profile: 'Perfil',
      settings: 'Configuración',
      workouts: 'Entrenamientos',
      nutrition: 'Nutrición',
      community: 'Comunidad',

      // Errors
      error: 'Error',
      notFound: 'Página no encontrada',
      serverError: 'Ocurrió un error del servidor',

      // Success messages

      // Validation
      required: 'Este campo es obligatorio',
      invalidEmail: 'Por favor ingrese un correo válido',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',

      // User profile
      name: 'Nombre',
      age: 'Edad',
      weight: 'Peso',
      height: 'Altura',
      goal: 'Objetivo',

      // Workouts
      myWorkouts: 'Mis Entrenamientos',
      createWorkout: 'Crear Entrenamiento',
      workoutName: 'Nombre del Entrenamiento',
      duration: 'Duración',
      exercises: 'Ejercicios',

      // Nutrition
      myNutrition: 'Mi Nutrición',
      dailyCalories: 'Calorías Diarias',
      protein: 'Proteína',
      carbs: 'Carbohidratos',
      fat: 'Grasa',

      // Settings
      language: 'Idioma',
      theme: 'Tema',
      notifications: 'Notificaciones',
      privacy: 'Privacidad',

      // Buttons
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      submit: 'Enviar'
    }
  },
  fr: {
    translation: {
      // General
      welcome: 'Bienvenue sur Spartan Hub',
      greeting: 'Bonjour {{name}} !',
      goodbye: 'Au revoir',

      // Authentication
      login: 'Connexion',
      logout: 'Déconnexion',
      register: 'S\'inscrire',
      email: 'Email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      loginSuccess: 'Connexion réussie',
      logoutSuccess: 'Déconnexion réussie',
      logoutAllSuccess: 'Toutes les sessions ont été déconnectées avec succès',
      registerSuccess: 'Compte créé avec succès',
      invalidCredentials: 'Identifiants invalides',
      emailAlreadyExists: 'Un utilisateur avec cet email existe déjà',
      unauthorized: 'Accès non autorisé',
      insufficientPermissions: 'Autorisations insuffisantes',
      userNotFound: 'Utilisateur non trouvé',
      updateUserFailed: 'Échec de la mise à jour de l\'utilisateur',
      userRoleUpdated: 'Rôle d\'utilisateur mis à jour avec succès',
      invalidRole: 'Rôle invalide',

      // Navigation
      dashboard: 'Tableau de bord',
      profile: 'Profil',
      settings: 'Paramètres',
      workouts: 'Entraînements',
      nutrition: 'Nutrition',
      community: 'Communauté',

      // Errors
      error: 'Erreur',
      notFound: 'Page non trouvée',
      serverError: 'Une erreur du serveur s\'est produite',

      // Success messages

      // Validation
      required: 'Ce champ est requis',
      invalidEmail: 'Veuillez entrer un email valide',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',

      // User profile
      name: 'Nom',
      age: 'Âge',
      weight: 'Poids',
      height: 'Taille',
      goal: 'Objectif',

      // Workouts
      myWorkouts: 'Mes Entraînements',
      createWorkout: 'Créer un Entraînement',
      workoutName: 'Nom de l\'Entraînement',
      duration: 'Durée',
      exercises: 'Exercices',

      // Nutrition
      myNutrition: 'Ma Nutrition',
      dailyCalories: 'Calories Quotidiennes',
      protein: 'Protéines',
      carbs: 'Glucides',
      fat: 'Graisses',

      // Settings
      language: 'Langue',
      theme: 'Thème',
      notifications: 'Notifications',
      privacy: 'Confidentialité',

      // Buttons
      save: 'Sauvegarder',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      submit: 'Soumettre'
    }
  }
} as const;

// Initialize i18next
const i18n = i18next.createInstance();

i18n
  .use(HttpBackend)
  .use(HttpMiddleware.LanguageDetector)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    lng: DEFAULT_LANGUAGE,
    resources,
    ns: ['translation'],
    defaultNS: 'translation',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order and from where user language should be detected
      order: ['querystring', 'cookie', 'header', 'sessionStorage', 'localStorage'],

      // Keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupHeader: 'accept-language',
      lookupSessionStorage: 'i18nextLng',
      lookupLocalStorage: 'i18nextLng',

      // Cache user language on
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'], // Languages to not persist (cookie, localStorage)

      // Optional expire and domain for set cookie
      cookieMinutes: 10,
      cookieDomain: 'localhost',
    }
  });

export default i18n;