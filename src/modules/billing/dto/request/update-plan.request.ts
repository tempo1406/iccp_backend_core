import { PartialType } from '@nestjs/swagger';
import { CreatePlanRequest } from './create-plan.request';

export class UpdatePlanRequest extends PartialType(CreatePlanRequest) {}
