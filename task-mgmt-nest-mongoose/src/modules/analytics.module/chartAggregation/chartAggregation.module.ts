import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../../task.module/task/task.schema';
import { ChartAggregationController } from './controllers/chartAggregation.controller';
import { ChartAggregationService } from './services/chartAggregation.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
  controllers: [ChartAggregationController],
  providers: [ChartAggregationService],
  exports: [ChartAggregationService],
})
export class ChartAggregationModule {}
