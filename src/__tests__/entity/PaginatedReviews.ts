import { Review } from "./Review";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class PaginatedReviews {
  @Field(type => [Review])
  public readonly reviews: Review[];

  @Field(type => Int)
  public readonly offset: number;

  @Field()
  public readonly hasMore: boolean;

  constructor(reviews: Review[], offset: number, hasMore: boolean) {
    this.reviews = reviews;
    this.offset = offset;
    this.hasMore = hasMore;
  }

  @Field()
  public maxRating(): number {
    return Math.max(...this.reviews.map(review => review.rating));
  }

  @Field()
  public minRating(): number {
    return Math.min(...this.reviews.map(review => review.rating));
  }
}
