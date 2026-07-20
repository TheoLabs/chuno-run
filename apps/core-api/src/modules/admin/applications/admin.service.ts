import { DddService } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/admin.repository';

@Injectable()
export class AdminService extends DddService {
  constructor(private readonly adminRepository: AdminRepository) {
    super();
  }
}
