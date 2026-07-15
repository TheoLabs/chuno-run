import { DddService } from '@libs/ddd';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoomRepository } from '../infrastructure/room.repository';
import { Transactional } from '@libs/decorators';
import { User } from '@modules/user/domain/user.entity';
import { CalendarDate } from '@types';
import { Room, RoomStatus } from '../domain/room.entity';
import { PaginationOptions } from '@libs/utils';
import { GeneralRoomListResponseDto, GeneralRoomRetrieveResponseDto } from '../presentation/dto';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { keyBy } from 'lodash';

@Injectable()
export class GeneralRoomService extends DddService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roomRepository: RoomRepository
  ) {
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
          isJoined: room.participants.some((p) => p.userId === user.id),
          currentParticipantCount: room.participants.length,
        })
      ),
      total,
    };
  }

  async retrieve({ user, id }: { user: User; id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    const users = await this.userRepository.find({ ids: room.participants.map((p) => p.userId) });
    const userById = keyBy(users, 'id');

    return room.toInstance(GeneralRoomRetrieveResponseDto, {
      participants: room.participants.map((p) => ({ ...p, user: userById[p.userId] })),
    });
  }

  @Transactional()
  async changeSetting({
    user,
    id,
    title,
    capacity,
    goalDistanceMeter,
    goalLimitMinutes,
  }: {
    user: User;
    id: number;
    title?: string;
    capacity?: number;
    goalDistanceMeter?: number;
    goalLimitMinutes?: number;
  }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.changeSetting({ hostUserId: user.id, title, capacity, goalDistanceMeter, goalLimitMinutes });
    await this.roomRepository.save([room]);
  }

  @Transactional()
  async cancel({ user, id }: { user: User; id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.cancel(user.id);

    await this.roomRepository.save([room]);

    return { id: room.id };
  }

  @Transactional()
  async join({ user, id }: { user: User; id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.join(user.id);

    await this.roomRepository.save([room]);

    return { id: room.id };
  }

  @Transactional()
  async exit({ user, id }: { user: User; id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.exit(user.id);

    await this.roomRepository.save([room]);

    return { id: room.id };
  }

  @Transactional()
  async kick({ user, roomId, participantId }: { user: User; roomId: number; participantId: number }) {
    const [room] = await this.roomRepository.find({ id: roomId }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.kick({ hostUserId: user.id, participantId });

    await this.roomRepository.save([room]);

    return { id: room.id };
  }
}
