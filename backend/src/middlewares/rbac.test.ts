import { Request, Response, NextFunction } from 'express';
import { requireRole } from './rbac.middleware';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should return 500 if req.user is missing (authMiddleware not applied)', () => {
    const middleware = requireRole('admin');
    
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not in allowed roles', () => {
    mockRequest.user = { id: 'user1', role: 'user' };
    const middleware = requireRole('admin', 'collector');
    
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'FORBIDDEN_ROLE',
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() if user role is in allowed roles', () => {
    mockRequest.user = { id: 'admin1', role: 'admin' };
    const middleware = requireRole('admin', 'collector');
    
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });
});
