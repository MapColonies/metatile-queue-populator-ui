import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { RasterConfigController } from '../../../src/raster/controllers/rasterConfigController';

describe('RasterConfigController', () => {
  let controller: RasterConfigController;
  let mockLogger: any;
  let mockConfig: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'raster.cswUrl') return 'https://raster-csw-prod.mapcolonies.net/csw';
        if (key === 'raster.token') return 'mock-token-123';
        return undefined;
      }),
      has: vi.fn((key: string) => key === 'raster.token'),
    };

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    controller = new RasterConfigController(mockLogger, mockConfig);
  });

  it('should return 200 with cswUrl and token', () => {
    controller.getConfig(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      cswUrl: 'https://raster-csw-prod.mapcolonies.net/csw',
      token: 'mock-token-123',
      defaultMap: undefined,
    });
  });

  it('should return undefined token when not configured', () => {
    mockConfig.has.mockReturnValue(false);
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'raster.cswUrl') return 'https://raster-csw-prod.mapcolonies.net/csw';
      return undefined;
    });

    controller.getConfig(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      cswUrl: 'https://raster-csw-prod.mapcolonies.net/csw',
      token: undefined,
      defaultMap: undefined,
    });
  });

  it('should call next on unexpected error', () => {
    const error = new Error('Config missing');
    mockConfig.get.mockImplementation(() => {
      throw error;
    });

    controller.getConfig(mockReq as Request, mockRes as Response, mockNext);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
