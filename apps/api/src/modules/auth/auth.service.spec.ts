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

    expect(jwtService.sign).toHaveBeenCalled();
    expect(result.accessToken).toBe('signed-token');
  });
});
