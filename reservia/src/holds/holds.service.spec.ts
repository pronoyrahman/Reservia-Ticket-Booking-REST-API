import { Test, TestingModule } from '@nestjs/testing';
import { HoldsService } from './holds.service.js';

describe('HoldsService', () => {
  let service: HoldsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HoldsService],
    }).compile();

    service = module.get<HoldsService>(HoldsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
