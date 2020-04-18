import { Arg, Ctx, ID, Info, Int, Query, Resolver } from "type-graphql";
import { Author } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";

@Resolver(Author)
export class AuthorResolver {
  @Query(returns => Author)
  async authorById(
    @Arg("id", type => Int) id: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    const author = await loader
      .loadEntity(Author)
      .where("author.id = :id", { id })
      .info(info)
      .loadOne();

    if (!author) {
      throw new AuthorNotFoundError();
    }
    return author;
  }
}

class AuthorNotFoundError extends Error {}
