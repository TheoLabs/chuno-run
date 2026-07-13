import { ContextKey } from '@libs/context';
import { InternalServerErrorException } from '@nestjs/common';
import { DddEvent, DddService } from '@libs/ddd';

export function Transactional() {
  return function (target: DddService, propertyKey: string, descriptor: PropertyDescriptor) {
    // NOTE: 적용된 메서드의 function
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: DddService, ...args: any[]) {
      let result: any;

      // @ts-expect-error private으로 되어있어서 타입에러 발생.
      const context = this.context;
      // @ts-expect-error private으로 되어있어서 타입에러 발생.
      const entityManager = this.entityManager;
      // @ts-expect-error private으로 되어있어서 타입에러 발생.
      const eventEmitter = this.eventEmitter;

      if (!context || !entityManager) {
        throw new InternalServerErrorException('Context or Datasource instance is not existed.');
      }

      //  NOTE: 해당 방식은 무조건 transaction() 메서드가 제공하는 entityManager를 사용하여야한다. https://typeorm.io/docs/advanced-topics/transactions
      await entityManager.transaction(async (transactionEntityManager) => {
        context.set(ContextKey.ENTITY_MANAGER, transactionEntityManager);
        result = await originalMethod.apply(this, args);
        context.set(ContextKey.ENTITY_MANAGER, null);
      });

      // NOTE: DDD 이벤트를 꺼내서 Redis Queue로 넣어주기 위한 작업.
      const dddEvents = context.get<DddEvent[]>(ContextKey.DDD_EVENTS);
      if (dddEvents && dddEvents.length > 0) {
        dddEvents.forEach((dddEvent) => {
          eventEmitter.emit('ddd-event.created', dddEvent);
        });
      }
      context.set(ContextKey.DDD_EVENTS, []);

      return result;
    };
    return descriptor;
  };
}
