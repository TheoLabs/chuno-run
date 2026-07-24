import { DddService } from '@libs/ddd';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/admin.repository';
import { Transactional } from '@libs/decorators';
import { Admin, AdminStatus } from '../domain/admin.entity';
import { PaginationOptions } from '@libs/utils';
import { AdminResponseDto } from '../presentation/dto';

@Injectable()
export class AdminService extends DddService {
  constructor(private readonly adminRepository: AdminRepository) {
    super();
  }

  @Transactional()
  async preRegister({ email, name }: { email: string; name?: string }) {
    const [existingAdmin] = await this.adminRepository.find({ email });

    if (existingAdmin) {
      throw new BadRequestException('이미 등록되어있는 관리자 계정입니다.', {
        description: '이미 등록되어있는 관리자 계정입니다.',
      });
    }

    const admin = Admin.of({ email, name });

    await this.adminRepository.save([admin]);
  }

  async list({ statuses }: { statuses?: AdminStatus[] }, options?: PaginationOptions) {
    const [admins, total] = await Promise.all([
      this.adminRepository.find({ statuses }, { options }),
      this.adminRepository.count({ statuses }),
    ]);

    return { items: admins.map((admin) => admin.toInstance(AdminResponseDto)), total };
  }

  /**
   * 계정 비활성화. 마지막 활성 관리자이거나 자기 자신이면 막는다 —
   * 백오피스에 아무도 못 들어가는 상태를 만들지 않기 위해서다.
   */
  @Transactional()
  async disable({ id, requesterId }: { id: number; requesterId: number }) {
    if (id === requesterId) {
      throw new BadRequestException('자기 자신은 비활성화할 수 없습니다.', {
        description: '자기 자신은 비활성화할 수 없습니다.',
      });
    }

    const admin = await this.getOne(id);

    const activeCount = await this.adminRepository.count({ statuses: [AdminStatus.ACTIVE] });

    if (admin.status === AdminStatus.ACTIVE && activeCount <= 1) {
      throw new BadRequestException('마지막 활성 관리자는 비활성화할 수 없습니다.', {
        description: '마지막 활성 관리자는 비활성화할 수 없습니다.',
      });
    }

    admin.disable();

    await this.adminRepository.save([admin]);
  }

  @Transactional()
  async activate({ id }: { id: number }) {
    const admin = await this.getOne(id);

    admin.activate();

    await this.adminRepository.save([admin]);
  }

  private async getOne(id: number) {
    const [admin] = await this.adminRepository.find({ id });

    if (!admin) {
      throw new NotFoundException('존재하지 않는 관리자입니다.');
    }

    return admin;
  }
}
