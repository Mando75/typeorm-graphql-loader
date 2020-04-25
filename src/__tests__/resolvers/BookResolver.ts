import { Arg, Ctx, Info, Int, Query, Resolver } from "type-graphql";
import { Book } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";

@Resolver(Book)
export class BookResolver {
  @Query(returns => [Book])
  async booksByAuthorId(
    @Arg("authorId", type => Int) authorId: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    return loader
      .loadEntity(Book, "book")
      .where("book.authorId = :authorId", { authorId })
      .where("book.isPublished IS TRUE")
      .info(info)
      .loadMany();
  }

  @Query(returns => [Book])
  async booksByAuthorOrPublisher(
    @Arg("publisherId", type => Int) publisherId: number,
    @Arg("authorId", type => Int) authorId: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    return loader
      .loadEntity(Book, "books")
      .where("books.publisherId = :publisherId", { publisherId })
      .orWhere("books.authorId = :authorId", { authorId })
      .info(info)
      .loadMany();
  }
}
