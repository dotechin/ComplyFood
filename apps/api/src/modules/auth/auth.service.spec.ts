import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../../common/decorators/roles.decorator';

describe('AuthService', () => {
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    setPasswordResetToken: jest.fn(),
    findByPasswordResetTokenHash: jest.fn(),
    updatePassword: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(() => 'signed-token'),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService as any, jwtService as any, dataSource as any);
    process.env.WEB_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
  });

  it('returns a development reset link for an existing user', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'admin@demo.com' });
    usersService.setPasswordResetToken.mockResolvedValue(undefined);

    const result = await service.requestPasswordReset('admin@demo.com');

    expect(result.message).toContain('If the account exists');
    expect(result.resetToken).toBeDefined();
    expect(result.resetUrl).toContain('/reset-password?token=');
    expect(usersService.setPasswordResetToken).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(Date),
    );
  });

  it('updates the password for a valid reset token', async () => {
    usersService.findByPasswordResetTokenHash.mockResolvedValue({ id: 'user-1' });
    usersService.updatePassword.mockResolvedValue(undefined);

    const result = await service.resetPassword('valid-token', 'newpassword123');

    expect(result.message).toBe('Password updated successfully.');
    expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', 'newpassword123');
  });

  it('rejects an invalid reset token', async () => {
    usersService.findByPasswordResetTokenHash.mockResolvedValue(null);

    await expect(service.resetPassword('invalid-token', 'newpassword123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('logs in registered users', async () => {
    usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'admin@demo.com',
      role: UserRole.ADMIN,
      orgId: 'org-1',
    });

    const result = await service.register('admin@demo.com', 'password123', UserRole.ADMIN, 'org-1');

    expect(usersService.create).toHaveBeenCalledWith('admin@demo.com', 'password123', UserRole.ADMIN, 'org-1');
    expect(jwtService.sign).toHaveBeenCalled();
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'admin@demo.com',
      role: UserRole.ADMIN,
      orgId: 'org-1',
    });
  });

  it('bootstraps the first organization and admin user', async () => {
    const query = jest.fn();
    const orgRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'org-1', ...value })),
    };
    const userRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'user-1', ...value })),
    };

    dataSource.transaction.mockImplementation(async (callback: any) =>
      callback({
        query,
        getRepository: (entity: any) => (entity?.name === 'User' ? userRepo : orgRepo),
      }),
    );

    const result = await service.bootstrapOrganization(
      'Demo Restaurant',
      'owner@demo.com',
      'password123',
      'Via Roma 1',
      'restaurant',
    );

    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'owner@demo.com',
      role: UserRole.ADMIN,
      orgId: 'org-1',
    });
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@demo.com',
        role: UserRole.ADMIN,
        orgId: 'org-1',
      }),
    );
    expect(query).toHaveBeenNthCalledWith(1, 'LOCK TABLE organizations IN SHARE ROW EXCLUSIVE MODE');
    expect(query).toHaveBeenNthCalledWith(2, 'LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
  });

  it('normalizes bootstrap organization fields before saving', async () => {
    const orgRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'org-1', ...value })),
    };
    const userRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'user-1', ...value })),
    };

    dataSource.transaction.mockImplementation(async (callback: any) =>
      callback({
        query: jest.fn(),
        getRepository: (entity: any) => (entity?.name === 'User' ? userRepo : orgRepo),
      }),
    );

    await service.bootstrapOrganization('  Demo Restaurant  ', 'owner@demo.com', 'password123', '  Via Roma 1  ', '  restaurant  ');

    expect(orgRepo.create).toHaveBeenCalledWith({
      name: 'Demo Restaurant',
      address: 'Via Roma 1',
      category: 'restaurant',
    });
  });

  it('rejects bootstrap when the trimmed organization name is shorter than 2 characters', async () => {
    await expect(
      service.bootstrapOrganization(' a ', 'owner@demo.com', 'password123'),
    ).rejects.toThrow('Organization name must be at least 2 characters');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects bootstrap after setup is complete', async () => {
    const orgRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    const userRepo = {
      count: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
    };

    dataSource.transaction.mockImplementation(async (callback: any) =>
      callback({
        query: jest.fn(),
        getRepository: (entity: any) => (entity?.name === 'User' ? userRepo : orgRepo),
      }),
    );

    await expect(
      service.bootstrapOrganization('Demo Restaurant', 'owner@demo.com', 'password123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects bootstrap when the email already exists inside the transaction', async () => {
    const orgRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      save: jest.fn(),
    };
    const userRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue({ id: 'existing-user' }),
      create: jest.fn(),
      save: jest.fn(),
    };

    dataSource.transaction.mockImplementation(async (callback: any) =>
      callback({
        query: jest.fn(),
        getRepository: (entity: any) => (entity?.name === 'User' ? userRepo : orgRepo),
      }),
    );

    await expect(
      service.bootstrapOrganization('Demo Restaurant', 'owner@demo.com', 'password123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orgRepo.save).not.toHaveBeenCalled();
  });
});
