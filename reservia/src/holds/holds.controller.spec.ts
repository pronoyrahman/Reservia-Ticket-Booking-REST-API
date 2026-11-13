import { Test, TestingModule } from '@nestjs/testing';
import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';

describe('HoldsController', () => {
  let controller: HoldsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HoldsController],
      providers: [HoldsService],
    }).compile();

    controller = module.get<HoldsController>(HoldsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
