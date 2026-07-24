import { today } from '@libs/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UserRepository } from '../infrastructure/user.repository';
import { AgreementRepository } from '@modules/agreement/infrastructure/agreement.repository';
import { AgreementStatus } from '@modules/agreement/domain/agreement.entity';
import { GeneralAgreementResponseDto } from '@modules/agreement/presentation/dto';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';
import { DeviceRepository } from '@modules/device/infrastructure/device.repository';
import { DeviceStatus } from '@modules/device/domain/device.entity';

@Injectable()
export class GeneralUserService extends DddService {
  constructor(
    private readonly agreementRepository: AgreementRepository,
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository
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

  /**
   * 재동의가 필요한 약관 목록 — 현재 시행 중(active)인 약관 가운데 이 사용자가 아직 동의하지 않은 것.
   *
   * 약관이 개정되면 새 버전이 새 Agreement 로 활성화되므로, 기존 사용자의 동의 이력에는 그 id 가 없어
   * 자연히 여기에 잡힌다. 필수 약관이 하나라도 남아 있으면 서비스 이용 전에 재동의를 받아야 한다.
   */
  async listPendingConsents({ user }: { user: User }) {
    const [activeAgreements, [target]] = await Promise.all([
      this.agreementRepository.find({ statuses: [AgreementStatus.ACTIVE] }),
      this.userRepository.find({ ids: [user.id] }, { relations: { userConsents: true } }),
    ]);

    const agreedAgreementIds = new Set(
      (target?.userConsents ?? []).filter((consent) => consent.isAgreed).map((consent) => consent.agreementId)
    );
    const items = activeAgreements.filter((agreement) => !agreedAgreementIds.has(agreement.id));

    return {
      items: items.map((agreement) => agreement.toInstance(GeneralAgreementResponseDto)),
      total: items.length,
      /** 필수 약관이 남아 있으면 진입을 막고 재동의 화면을 띄운다. */
      hasRequired: items.some((agreement) => agreement.required),
    };
  }

  /**
   * 약관 재동의 저장. 제출한 약관이 모두 실재하는 활성 약관인지 확인하고,
   * 저장 후 시행 중인 **필수 약관에 빠짐없이 동의**했는지 검증한다.
   */
  @Transactional()
  async consent({ user, consents }: { user: User; consents: { agreementId: number; isAgreed: boolean }[] }) {
    const agreementIds = [...new Set(consents.map((consent) => consent.agreementId))];

    const activeAgreements = await this.agreementRepository.find({
      ids: agreementIds,
      statuses: [AgreementStatus.ACTIVE],
    });

    if (activeAgreements.length !== agreementIds.length) {
      throw new BadRequestException('시행 중이 아니거나 존재하지 않는 약관이 포함되어 있습니다.', {
        description: '시행 중이 아니거나 존재하지 않는 약관이 포함되어 있습니다.',
      });
    }

    // 동의 이력을 갱신하려면 관계가 로드된 애그리게이트가 필요하다(가드가 넣어준 user 에는 없다).
    const [target] = await this.userRepository.find({ ids: [user.id] }, { relations: { userConsents: true } });

    if (!target) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    target.reconsent(consents);

    const requiredAgreements = await this.agreementRepository.find({
      statuses: [AgreementStatus.ACTIVE],
      required: [true],
    });
    const agreedIds = new Set(
      target.userConsents.filter((consent) => consent.isAgreed).map((consent) => consent.agreementId)
    );

    if (requiredAgreements.some((agreement) => !agreedIds.has(agreement.id))) {
      throw new BadRequestException('필수 약관에 모두 동의해야 합니다.', {
        description: '필수 약관에 모두 동의해야 합니다.',
      });
    }

    await this.userRepository.save([target]);
  }

  @Transactional()
  async update({ user, nickname }: { user: User; nickname?: string }) {
    user.update({ nickname });

    await this.userRepository.save([user]);
  }

  /**
   * [2차] 계정 탈퇴 — User.status=exited 전이 + 요청 시각 기록. 30일 유예 후 파기 대상이 된다.
   * 진행 중 경주 참가는 dnf 로 정리하고, 모든 기기 세션·토큰을 해지해 알림을 끊는다.
   */
  @Transactional()
  async withdraw({ user }: { user: User }) {
    const now = today('YYYY-MM-DD HH:mm:ss');

    // 관계 없이 상태만 바꾸므로 가드가 넣어준 user 를 그대로 쓴다.
    user.withdraw();
    await this.userRepository.save([user]);

    // 진행 중(running)인 참가는 포기(dnf)로 정리한다. 최종 등수는 그 방이 종료될 때 매겨진다.
    const runningParticipants = await this.roomRepository.findParticipants({
      userId: user.id,
      statuses: [ParticipantStatus.RUNNING],
    });
    runningParticipants.forEach((participant) => participant.quit(now));
    if (runningParticipants.length > 0) {
      await this.roomRepository.saveParticipants(runningParticipants);
    }

    // 모든 활성 기기를 해지해 이후 알림이 가지 않게 한다.
    const devices = await this.deviceRepository.find({ userId: user.id, statuses: [DeviceStatus.ACTIVE] });
    devices.forEach((device) => device.revoke());
    if (devices.length > 0) {
      await this.deviceRepository.save(devices);
    }
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
