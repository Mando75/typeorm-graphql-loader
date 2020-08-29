import { Arg, Ctx, Info, Int, Query, Resolver } from "type-graphql";
import { PaginatedReviews, ReviewConnection } from "../entity/PaginatedReviews";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";
import { Review } from "../entity";

@Resolver(PaginatedReviews)
export class ReviewResolver {
  @Query(returns => PaginatedReviews)
  async paginatedReviews(
    @Arg("offset", type => Int) offset: number,
    @Arg("limit", type => Int) limit: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ): Promise<PaginatedReviews> {
    const [reviews, count] = await loader
      .loadEntity(Review)
      .info(info, "reviews")
      .paginate({ offset, limit })
      .selectFields(["rating"])
      .order({ rating: "DESC" })
      .loadPaginated();

    const nextOffset = offset + limit;
    const recordsLeft = count - nextOffset;
    const newOffset = recordsLeft < 1 ? count : nextOffset;
    return new PaginatedReviews(reviews, newOffset, newOffset !== count);
  }

  @Query(returns => ReviewConnection)
  async reviewConnection(
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ): Promise<ReviewConnection> {
    const [reviews, count] = await loader
      .loadEntity(Review)
      .info(info, "edges.node")
      .selectFields(["rating"])
      .paginate({ offset: 0, limit: 15 })
      .loadPaginated();
    return new ReviewConnection(count, reviews);
  }

  @Query(returns => PaginatedReviews, {
    deprecationReason:
      "Only to test backwards compatibility with primary key option"
  })
  async deprecatedPrimaryKey(
    @Arg("offset", type => Int) offset: number,
    @Arg("limit", type => Int) limit: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ): Promise<PaginatedReviews> {
    const [reviews, count] = await loader
      .loadEntity(Review)
      .info(info, "reviews")
      .paginate({ offset, limit })
      .order({ rating: "DESC" })
      .loadPaginated();

    const nextOffset = offset + limit;
    const recordsLeft = count - nextOffset;
    const newOffset = recordsLeft < 1 ? count : nextOffset;
    return new PaginatedReviews(reviews, newOffset, newOffset !== count);
  }
}
