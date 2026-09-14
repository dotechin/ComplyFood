import { UserRole } from '../../common/decorators/roles.decorator';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    register: jest.fn(),
    bootstrapOrganization: jest.fn(),
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  it('redacts the password from the audited register request body', () => {
    const request = {
      body: {
        password: 'super-secret-password',
      },
    };

    controller.register(
      { orgId: 'org-1' },
      {
        email: 'staff@example.com',
        password: 'super-secret-password',
        role: UserRole.STAFF,
      } as any,
      request as any,
    );

    expect(request.body.password).toBe('[REDACTED]');
    expect(authService.register).toHaveBeenCalledWith(
      'staff@example.com',
      'super-secret-password',
      UserRole.STAFF,
      'org-1',
    );
  });

  it('forwards bootstrap fields to the service', () => {
    controller.bootstrap({
      organizationName: 'Demo Restaurant',
      organizationAddress: 'Via Roma 1',
      organizationCategory: 'restaurant',
      email: 'owner@example.com',
      password: 'password123',
    } as any);

    expect(authService.bootstrapOrganization).toHaveBeenCalledWith(
      'Demo Restaurant',
      'owner@example.com',
      'password123',
      'Via Roma 1',
      'restaurant',
    );
  });

  it('forwards password reset confirmation requests', () => {
    controller.resetPassword({
      token: 'reset-token',
      password: 'newpassword123',
    } as any);

    expect(authService.resetPassword).toHaveBeenCalledWith('reset-token', 'newpassword123');
  });
});
