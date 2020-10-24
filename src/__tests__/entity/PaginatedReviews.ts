import { Review } from "./Review";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class PaginatedReviews {
  @Field((type) => [Review])
  public readonly reviews: Review[];

  @Field((type) => Int)
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
    return Math.max(...this.reviews.map((review) => review.rating));
  }

  @Field()
  public minRating(): number {
    return Math.min(...this.reviews.map((review) => review.rating));
  }
}

@ObjectType()
export class ReviewConnection {
  @Field((type) => Int)
  public readonly totalCount: number;

  @Field((type) => [ReviewEdge])
  public readonly edges: ReviewEdge[];

  constructor(totalCount: number, records: Review[]) {
    this.totalCount = totalCount;
    this.edges = records.map(
      (review) => new ReviewEdge(review, review.id.toString())
    );
  }
}

@ObjectType()
export class ReviewEdge {
  @Field((type) => Review)
  public readonly node: Review;

  @Field()
  public readonly cursor: string;

  constructor(node: Review, cursor: string) {
    this.node = node;
    this.cursor = cursor;
  }
}
