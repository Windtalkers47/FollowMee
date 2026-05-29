import { Repository, FindOptionsWhere } from 'typeorm';
import { CommentReaction } from '../entities/CommentReaction';
import dataSource from '../config/database';

export class CommentReactionRepository {
  private _repository: Repository<CommentReaction>;

  constructor() {
    this._repository = dataSource.getRepository(CommentReaction);
  }

  /**
   * Find reaction by comment and user
   */
  async findByCommentAndUser(commentId: number, userId: number): Promise<CommentReaction | null> {
    return this._repository.findOne({
      where: { commentId, userId } as FindOptionsWhere<CommentReaction>
    });
  }

  /**
   * Find all reactions for a comment with user relations
   */
  async findByCommentId(commentId: number): Promise<CommentReaction[]> {
    return this._repository.find({
      where: { commentId } as FindOptionsWhere<CommentReaction>,
      relations: ['user']
    });
  }

  /**
   * Find a single reaction with user relation
   */
  async findOneWithUser(where: FindOptionsWhere<CommentReaction>): Promise<CommentReaction | null> {
    return this._repository.findOne({
      where,
      relations: ['user']
    });
  }

  /**
   * Save a reaction
   */
  async save(reaction: CommentReaction): Promise<CommentReaction> {
    return this._repository.save(reaction);
  }

  /**
   * Delete reaction by comment and user
   */
  async deleteReaction(commentId: number, userId: number): Promise<void> {
    await this._repository.delete({ commentId, userId } as FindOptionsWhere<CommentReaction>);
  }
}