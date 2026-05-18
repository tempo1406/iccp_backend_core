import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { DocumentCategory } from './entities/document-category.entity';
import { CreateCategoryRequest } from './dto/request/create-category.request';
import { UpdateCategoryRequest } from './dto/request/update-category.request';
import { CategoryResponse } from './dto/response/category.response';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly categoryRepo: Repository<DocumentCategory>,
  ) {}

  async create(
    orgId: string | undefined,
    dto: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    try {
      const existing = await this.categoryRepo.findOne({
        where: { organizationId: orgId ?? IsNull(), name: dto.name },
      });
      if (existing) throw new ValidationException(ErrorCode.DC002);

      const category = this.categoryRepo.create({
        organizationId: orgId ?? undefined,
        name: dto.name,
        description: dto.description,
      });
      const saved = await this.categoryRepo.save(category);

      return plainToInstance(CategoryResponse, saved, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Lấy categories của org + system-level categories (org_id IS NULL)
  async findAll(orgId?: string): Promise<CategoryResponse[]> {
    try {
      const where = orgId
        ? [{ organizationId: orgId }, { organizationId: IsNull() }]
        : [{ organizationId: IsNull() }];

      const categories = await this.categoryRepo.find({
        where,
        order: { name: 'ASC' },
      });

      return plainToInstance(CategoryResponse, categories, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error finding all categories:', error);
      throw error;
    }
  }

  async findById(categoryId: string): Promise<CategoryResponse> {
    try {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (!category) throw new ValidationException(ErrorCode.DC001);

      return plainToInstance(CategoryResponse, category, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error finding category by id:', error);
      throw error;
    }
  }

  async update(
    categoryId: string,
    dto: UpdateCategoryRequest,
  ): Promise<CategoryResponse> {
    try {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (!category) throw new ValidationException(ErrorCode.DC001);

      if (dto.name !== undefined) category.name = dto.name;
      if (dto.description !== undefined) category.description = dto.description;

      const saved = await this.categoryRepo.save(category);
      return plainToInstance(CategoryResponse, saved, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async delete(categoryId: string): Promise<void> {
    try {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (!category) throw new ValidationException(ErrorCode.DC001);

      await this.categoryRepo.softRemove(category);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}
