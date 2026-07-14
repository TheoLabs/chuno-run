import { DddService } from '@libs/ddd';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RoomRepository } from '../infrastructure/room.repository';
import { Transactional } from '@libs/decorators';
import { User } from '@modules/user/domain/user.entity';
import { CalendarDate } from '@types';
import { Room, RoomStatus } from '../domain/room.entity';
import { PaginationOptions } from '@libs/utils';
import { GeneralRoomListResponseDto } from '../presentation/dto';

@Injectable()
export class GeneralRoomService extends DddService {
  constructor(private readonly roomRepository: RoomRepository) {
    super();
  }

  @Transactional()
  async create({
    user,
    title,
    goalDistanceMeter,
    goalLimitMinutes,
    startOn,
    capacity,
  }: {
    user: User;
    title: string;
    goalDistanceMeter: number;
    goalLimitMinutes: number;
    startOn: CalendarDate;
    capacity: number;
  }) {
    const [existingRoom] = await this.roomRepository.find({
      hostUserId: user.id,
      statuses: [RoomStatus.LIVE, RoomStatus.READY, RoomStatus.RECRUITING],
    });

    if (existingRoom) {
      throw new BadRequestException('이미 진행중인 방이 있습니다.', { description: '이미 진행중인 방이 있습니다.' });
    }

    const room = Room.create({
      hostUserId: user.id,
      title,
      goalDistanceMeter,
      goalLimitMinutes,
      startOn,
      capacity,
    });

    await this.roomRepository.save([room]);

    return { id: room.id };
  }

  async list(
    {
      user,
      statuses,
      minGoalDistanceMeter,
      maxGoalDistanceMeter,
      minGoalLimitMinutes,
      maxGoalLimitMinutes,
    }: {
      user: User;
      statuses?: RoomStatus[];
      minGoalDistanceMeter?: number;
      maxGoalDistanceMeter?: number;
      minGoalLimitMinutes?: number;
      maxGoalLimitMinutes?: number;
    },
    options?: PaginationOptions
  ) {
    const [rooms, total] = await Promise.all([
      this.roomRepository.find(
        {
          statuses: statuses || [RoomStatus.RECRUITING, RoomStatus.READY, RoomStatus.LIVE],
          minGoalDistanceMeter,
          maxGoalDistanceMeter,
          minGoalLimitMinutes,
          maxGoalLimitMinutes,
        },
        { options, relations: { participants: true } }
      ),
      this.roomRepository.count({
        statuses: statuses || [RoomStatus.RECRUITING, RoomStatus.READY, RoomStatus.LIVE],
        minGoalDistanceMeter,
        maxGoalDistanceMeter,
        minGoalLimitMinutes,
        maxGoalLimitMinutes,
      }),
    ]);

    return {
      items: rooms.map((room) =>
        room.toInstance(GeneralRoomListResponseDto, {
          currentParticipantCount: room.participants.length,
        })
      ),
      total,
    };
  }
}
