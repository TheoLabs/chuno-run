import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UserRepository } from '../infrastructure/user.repository';
import { AgreementRepository } from '@modules/agreement/infrastructure/agreement.repository';
import { AgreementStatus } from '@modules/agreement/domain/agreement.entity';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';

@Injectable()
export class GeneralUserService extends DddService {
  constructor(
    private readonly agreementRepository: AgreementRepository,
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository
  ) {
    super();
  }

  @Transactional()
  async onboard({
    user,
    nickname,
    consents,
  }: {
    user: User;
    nickname: string;
    consents: { agreementId: number; isAgreed: boolean }[];
  }) {
    user.validOnboarded();

    const agreementIds = [...new Set(consents.map((c) => c.agreementId))];
    const agreements = await this.agreementRepository.find({ ids: agreementIds });

    // 제출된 약관이 모두 실재하고 활성 상태인지 확인
    if (agreements.length !== agreementIds.length) {
      throw new BadRequestException('존재하지 않는 약관이 포함되어 있습니다.');
    }
    agreements.forEach((agreement) => {
      if (agreement.status !== AgreementStatus.ACTIVE) {
        throw new InternalServerErrorException('유효한 이용 약관이 아닙니다. 확인이 필요합니다.');
      }
    });

    // NOTE: 필수 이용약관 동의 검증
    const requiredAgreements = await this.agreementRepository.find({
      statuses: [AgreementStatus.ACTIVE],
      required: [true],
    });
    const agreedIds = new Set(consents.filter((c) => c.isAgreed).map((c) => c.agreementId));
    const missingRequired = requiredAgreements.filter((agreement) => !agreedIds.has(agreement.id));
    if (missingRequired.length > 0) {
      throw new BadRequestException('필수 약관에 모두 동의해야 합니다.', {
        description: '필수 약관에 모두 동의해야 합니다.',
      });
    }

    user.onboard(nickname, consents);
    await this.userRepository.save([user]);
  }

  @Transactional()
  async update({ user, nickname }: { user: User; nickname?: string }) {
    user.update({ nickname });

    await this.userRepository.save([user]);
  }

  async getStats({ user }: { user: User }) {
    const participants = await this.roomRepository.findParticipants({ userId: user.id });
    const finishedCount = participants.filter((p) => p.status === ParticipantStatus.FINISHED).length;

    return {
      participatedRoomCount: [
        ...new Set(participants.filter((p) => p.status === ParticipantStatus.FINISHED).map((p) => p.roomId)),
      ].length,
      winCount: participants.filter((p) => p.finalRank === 1 && p.status === ParticipantStatus.FINISHED).length,
      totalRunningDistanceMeter: participants.reduce((acc, p) => acc + p.currentDistanceMeter, 0),
      completedRate: participants.length === 0 ? 0 : Math.round((finishedCount / participants.length) * 100),
    };
  }
}
