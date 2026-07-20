import { DddService } from '@libs/ddd';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/admin.repository';
import { Transactional } from '@libs/decorators';
import { Admin } from '../domain/admin.entity';

@Injectable()
export class AdminService extends DddService {
  constructor(private readonly adminRepository: AdminRepository) {
    super();
  }

  @Transactional()
  async preRegister({ email }: { email: string }) {
    const [existingAdmin] = await this.adminRepository.find({ email });

    if (existingAdmin) {
      throw new BadRequestException('이미 등록되어있는 관리자 계정입니다.', {
        description: '이미 등록되어있는 관리자 계정입니다.',
      });
    }

    const admin = Admin.of({ email });

    await this.adminRepository.save([admin]);
  }
}
