import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from '../../modules/audit/entities/audit-event.entity';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!WRITE_METHODS.has(request.method)) return next.handle();

    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((responseData) => {
        if (!user) return;
        const event = this.auditRepo.create({
          orgId: user.orgId ?? null,
          entityType: context.getClass().name,
          entityId: responseData?.id ?? null,
          action: request.method,
          userId: user.id,
          payload: {
            path: request.url,
            body: request.body,
            durationMs: Date.now() - startTime,
          },
        });
        this.auditRepo.save(event).catch(() => {});
      }),
    );
  }
}
