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
      .loadEntity(Book)
      .where("Book.authorId = :authorId", { authorId })
      .info(info)
      .loadMany();
  }
}
