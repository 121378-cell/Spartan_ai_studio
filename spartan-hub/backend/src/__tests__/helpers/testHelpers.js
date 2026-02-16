import { UserModel, SessionModel } from '../models';

/**
 * Crear usuario y sesión de prueba con relaciones válidas
 */
export const createTestUserWithSession = async (userData, sessionData) => {
  // Crear usuario primero
  const user = await UserModel.create(userData);
  
  // Crear sesión con ID de usuario válido
  const session = await SessionModel.create({
    ...sessionData,
    userId: user.id
  });
  
  return { user, session };
};

/**
 * Validar existencia de usuario antes de operaciones
 */
export const validateUserExists = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} does not exist`);
  }
  return user;
};

/**
 * Limpiar datos de prueba
 */
export const clearTestData = async () => {
  await UserModel.clear();
  await SessionModel.clear();
};
