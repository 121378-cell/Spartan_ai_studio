import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware para transformar parámetros de consulta
 * Convierte strings a tipos de datos apropiados y aplica validaciones básicas
 */
export function transformQueryParams(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.query && typeof req.query === 'object') {
      const transformedQuery: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(req.query)) {
        transformedQuery[key] = transformValue(value);
      }
      
      req.query = transformedQuery;
    }
    
    next();
  } catch (error) {
    logger.error('Error transforming query parameters', { 
      context: 'queryTransform', 
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' } 
    });
    next(error);
  }
}

/**
 * Transforma un valor de parámetro de consulta al tipo de dato apropiado
 */
function transformValue(value: unknown): unknown {
  // Manejar arrays
  if (Array.isArray(value)) {
    return value.map(item => transformSingleValue(item));
  }
  
  // Manejar valor único
  return transformSingleValue(value);
}

/**
 * Transforma un valor individual
 */
function transformSingleValue(value: unknown): unknown {
  // Si es undefined o null, retornar tal cual
  if (value === undefined || value === null) {
    return value;
  }
  
  // Si ya es un tipo primitivo no string, retornar tal cual
  if (typeof value !== 'string') {
    return value;
  }
  
  // Intentar transformar strings
  const trimmedValue = value.trim();
  
  // Manejar booleanos
  if (trimmedValue.toLowerCase() === 'true') return true;
  if (trimmedValue.toLowerCase() === 'false') return false;
  
  // Manejar números
  if (/^-?\d+$/.test(trimmedValue)) {
    return parseInt(trimmedValue, 10);
  }
  
  if (/^-?\d*\.\d+$/.test(trimmedValue)) {
    return parseFloat(trimmedValue);
  }
  
  // Manejar JSON
  try {
    const parsed = JSON.parse(trimmedValue);
    if (typeof parsed === 'object' || Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // No es JSON válido, continuar
  }
  
  // Por defecto, retornar el string original
  return trimmedValue;
}

/**
 * Middleware para validar y transformar parámetros de paginación
 */
export function validatePaginationParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const { page, limit, offset } = req.query;
    
    // Transformar parámetros si existen
    if (page !== undefined) {
      const pageNum = transformSingleValue(page);
      if (typeof pageNum === 'number' && pageNum > 0 && Number.isInteger(pageNum)) {
        (req.query as any).page = pageNum;
      } else {
        (req.query as any).page = 1; // Valor por defecto
      }
    }
    
    if (limit !== undefined) {
      const limitNum = transformSingleValue(limit);
      if (typeof limitNum === 'number' && limitNum > 0 && Number.isInteger(limitNum)) {
        // Limitar el máximo para evitar sobrecarga
        (req.query as any).limit = Math.min(limitNum, 100);
      } else {
        (req.query as any).limit = 10; // Valor por defecto
      }
    }
    
    if (offset !== undefined) {
      const offsetNum = transformSingleValue(offset);
      if (typeof offsetNum === 'number' && offsetNum >= 0 && Number.isInteger(offsetNum)) {
        (req.query as any).offset = offsetNum;
      } else {
        (req.query as any).offset = 0; // Valor por defecto
      }
    }
    
    // Calcular offset basado en page y limit si no se proporciona
    if ((req.query as any).page && (req.query as any).limit && (req.query as any).offset === undefined) {
      const page = (req.query as any).page as number;
      const limit = (req.query as any).limit as number;
      (req.query as any).offset = (page - 1) * limit;
    }
    
    next();
  } catch (error) {
    logger.error('Error validating pagination parameters', { 
      context: 'pagination', 
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' } 
    });
    next(error);
  }
}

/**
 * Middleware para validar y transformar parámetros de búsqueda
 */
export function validateSearchParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const { search, q, query } = req.query;
    
    // Normalizar parámetros de búsqueda
    if (search !== undefined) {
      const searchStr = transformSingleValue(search);
      if (typeof searchStr === 'string' && searchStr.length > 0) {
        req.query.search = searchStr;
      } else {
        delete req.query.search;
      }
    }
    
    if (q !== undefined) {
      const qStr = transformSingleValue(q);
      if (typeof qStr === 'string' && qStr.length > 0) {
        req.query.q = qStr;
      } else {
        delete req.query.q;
      }
    }
    
    if (query !== undefined) {
      const queryStr = transformSingleValue(query);
      if (typeof queryStr === 'string' && queryStr.length > 0) {
        req.query.query = queryStr;
      } else {
        delete req.query.query;
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error validating search parameters', { 
      context: 'search', 
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' } 
    });
    next(error);
  }
}

/**
 * Middleware para validar y transformar parámetros de ordenamiento
 */
export function validateSortParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const { sort, order, sortBy } = req.query;
    
    // Validar y transformar parámetros de ordenamiento
    if (sort !== undefined) {
      const sortStr = transformSingleValue(sort);
      if (typeof sortStr === 'string' && sortStr.length > 0) {
        req.query.sort = sortStr;
      } else {
        delete req.query.sort;
      }
    }
    
    if (order !== undefined) {
      const orderStr = transformSingleValue(order);
      const validOrders = ['asc', 'desc', 'ascending', 'descending'];
      if (typeof orderStr === 'string' && validOrders.includes(orderStr.toLowerCase())) {
        req.query.order = orderStr.toLowerCase();
      } else {
        req.query.order = 'asc'; // Valor por defecto
      }
    } else {
      // Establecer valor por defecto si no se proporciona
      req.query.order = 'asc';
    }
    
    if (sortBy !== undefined) {
      const sortByStr = transformSingleValue(sortBy);
      if (typeof sortByStr === 'string' && sortByStr.length > 0) {
        req.query.sortBy = sortByStr;
      } else {
        delete req.query.sortBy;
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error validating sort parameters', { 
      context: 'sort', 
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' } 
    });
    next(error);
  }
}

/**
 * Middleware combinado para transformación y validación de parámetros comunes
 */
export function commonQueryTransform(req: Request, res: Response, next: NextFunction): void {
  // Aplicar transformaciones básicas
  transformQueryParams(req, res, () => {
    // Validar parámetros de paginación
    validatePaginationParams(req, res, () => {
      // Validar parámetros de búsqueda
      validateSearchParams(req, res, () => {
        // Validar parámetros de ordenamiento
        validateSortParams(req, res, next);
      });
    });
  });
}

/**
 * Función para obtener parámetros de paginación transformados
 */
export function getPaginationParams(req: Request): { page: number; limit: number; offset: number } {
  const pageRaw = (req.query as any).page;
  const limitRaw = (req.query as any).limit;
  const offsetRaw = (req.query as any).offset;
  
  const page = typeof pageRaw === 'number' ? pageRaw : parseInt(String(pageRaw), 10) || 1;
  const limit = typeof limitRaw === 'number' ? limitRaw : parseInt(String(limitRaw), 10) || 10;
  const offset = typeof offsetRaw === 'number' ? offsetRaw : parseInt(String(offsetRaw), 10) || ((page - 1) * limit);
  
  return { page, limit, offset };
}

/**
 * Función para obtener parámetros de búsqueda transformados
 */
export function getSearchParams(req: Request): { search?: string; q?: string; query?: string } {
  return {
    search: req.query.search as string,
    q: req.query.q as string,
    query: req.query.query as string
  };
}

/**
 * Función para obtener parámetros de ordenamiento transformados
 */
export function getSortParams(req: Request): { sort?: string; order: 'asc' | 'desc'; sortBy?: string } {
  return {
    sort: req.query.sort as string,
    order: (req.query.order as 'asc' | 'desc') || 'asc',
    sortBy: req.query.sortBy as string
  };
}