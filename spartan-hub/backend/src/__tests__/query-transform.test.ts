import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { 
  transformQueryParams, 
  validatePaginationParams, 
  validateSearchParams, 
  validateSortParams,
  commonQueryTransform,
  getPaginationParams,
  getSearchParams,
  getSortParams
} from '../middleware/queryTransform';

describe('Query Transform Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockNext = jest.fn();
    mockRes = {};
  });

  describe('transformQueryParams', () => {
    it('should transform string numbers to numbers', () => {
      mockReq = {
        query: {
          page: '1',
          limit: '10',
          offset: '20'
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).page).toBe(1);
      expect((mockReq.query as any).limit).toBe(10);
      expect((mockReq.query as any).offset).toBe(20);
    });

    it('should transform string booleans to booleans', () => {
      mockReq = {
        query: {
          active: 'true',
          deleted: 'false'
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).active).toBe(true);
      expect((mockReq.query as any).deleted).toBe(false);
    });

    it('should transform string floats to numbers', () => {
      mockReq = {
        query: {
          rating: '4.5',
          price: '99.99'
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).rating).toBe(4.5);
      expect((mockReq.query as any).price).toBe(99.99);
    });

    it('should handle arrays correctly', () => {
      mockReq = {
        query: {
          tags: ['fitness', 'health'],
          ids: ['1', '2', '3']
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).tags).toEqual(['fitness', 'health']);
      expect((mockReq.query as any).ids).toEqual([1, 2, 3]);
    });

    it('should handle JSON objects', () => {
      mockReq = {
        query: {
          filter: '{"category": "fitness", "level": 2}'
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).filter).toEqual({ category: 'fitness', level: 2 });
    });

    it('should handle undefined and null values', () => {
      mockReq = {
        query: {
          undefinedValue: undefined,
          nullValue: 'null',
          stringValue: 'test'
        }
      };

      transformQueryParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).undefinedValue).toBeUndefined();
      expect((mockReq.query as any).nullValue).toBeNull();
      expect((mockReq.query as any).stringValue).toBe('test');
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate and transform pagination parameters', () => {
      mockReq = {
        query: {
          page: '2',
          limit: '20'
        }
      };

      validatePaginationParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).page).toBe(2);
      expect((mockReq.query as any).limit).toBe(20);
      expect((mockReq.query as any).offset).toBe(20); // (2-1) * 20
    });

    it('should set default values for invalid pagination parameters', () => {
      mockReq = {
        query: {
          page: 'invalid',
          limit: '-5'
        }
      };

      validatePaginationParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).page).toBe(1);
      expect((mockReq.query as any).limit).toBe(10);
      expect((mockReq.query as any).offset).toBe(0);
    });

    it('should limit maximum limit value', () => {
      mockReq = {
        query: {
          limit: '200'
        }
      };

      validatePaginationParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).limit).toBe(100); // Maximum allowed
    });

    it('should handle offset parameter directly', () => {
      mockReq = {
        query: {
          offset: '50'
        }
      };

      validatePaginationParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).offset).toBe(50);
    });
  });

  describe('validateSearchParams', () => {
    it('should validate and transform search parameters', () => {
      mockReq = {
        query: {
          search: '  fitness workout  ',
          q: 'health',
          query: ''
        }
      };

      validateSearchParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).search).toBe('fitness workout');
      expect((mockReq.query as any).q).toBe('health');
      expect((mockReq.query as any).query).toBeUndefined();
    });

    it('should remove empty search parameters', () => {
      mockReq = {
        query: {
          search: '',
          q: '   ',
          query: 'null'
        }
      };

      validateSearchParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).search).toBeUndefined();
      expect((mockReq.query as any).q).toBeUndefined();
      expect((mockReq.query as any).query).toBeUndefined();
    });
  });

  describe('validateSortParams', () => {
    it('should validate and transform sort parameters', () => {
      mockReq = {
        query: {
          sort: 'name',
          order: 'DESC',
          sortBy: 'createdAt'
        }
      };

      validateSortParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).sort).toBe('name');
      expect((mockReq.query as any).order).toBe('desc');
      expect((mockReq.query as any).sortBy).toBe('createdAt');
    });

    it('should set default order value', () => {
      mockReq = {
        query: {
          sort: 'name'
        }
      };

      validateSortParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).sort).toBe('name');
      expect((mockReq.query as any).order).toBe('asc');
    });

    it('should remove invalid order values', () => {
      mockReq = {
        query: {
          order: 'invalid'
        }
      };

      validateSortParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).order).toBe('asc');
    });
  });

  describe('commonQueryTransform', () => {
    it('should apply all transformations in sequence', () => {
      mockReq = {
        query: {
          page: '2',
          limit: '15',
          search: '  fitness  ',
          sort: 'name',
          order: 'ASC'
        }
      };

      commonQueryTransform(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq.query as any).page).toBe(2);
      expect((mockReq.query as any).limit).toBe(15);
      expect((mockReq.query as any).search).toBe('fitness');
      expect((mockReq.query as any).sort).toBe('name');
      expect((mockReq.query as any).order).toBe('asc');
    });
  });

  describe('Helper Functions', () => {
    it('should get pagination params correctly', () => {
      mockReq = {
        query: {
          page: '3',
          limit: '25'
        }
      };

      const params = getPaginationParams(mockReq as Request);

      expect(params.page).toBe(3);
      expect(params.limit).toBe(25);
      expect(params.offset).toBe(50); // (3-1) * 25
    });

    it('should get search params correctly', () => {
      mockReq = {
        query: {
          search: 'fitness',
          q: 'workout'
        }
      };

      const params = getSearchParams(mockReq as Request);

      expect(params.search).toBe('fitness');
      expect(params.q).toBe('workout');
      expect(params.query).toBeUndefined();
    });

    it('should get sort params correctly', () => {
      mockReq = {
        query: {
          sort: 'name',
          order: 'desc'
        }
      };

      const params = getSortParams(mockReq as Request);

      expect(params.sort).toBe('name');
      expect(params.order).toBe('desc');
      expect(params.sortBy).toBeUndefined();
    });

    it('should use default values when params are missing', () => {
      mockReq = {
        query: {}
      };

      const paginationParams = getPaginationParams(mockReq as Request);
      expect(paginationParams.page).toBe(1);
      expect(paginationParams.limit).toBe(10);
      expect(paginationParams.offset).toBe(0);

      const searchParams = getSearchParams(mockReq as Request);
      expect(searchParams.search).toBeUndefined();
      expect(searchParams.q).toBeUndefined();
      expect(searchParams.query).toBeUndefined();

      const sortParams = getSortParams(mockReq as Request);
      expect(sortParams.sort).toBeUndefined();
      expect(sortParams.order).toBe('asc');
      expect(sortParams.sortBy).toBeUndefined();
    });
  });
});