import {
  Arg,
  Ctx,
  ID,
  Info,
  Int,
  Query,
  registerEnumType,
  Resolver
} from "type-graphql";
import { Author } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";
import { LoaderSearchMethod } from "../..";

registerEnumType(LoaderSearchMethod, {
  name: "LoaderSearchMethod"
});

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

  @Query(returns => [Author])
  searchAuthors(
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo,
    @Arg("searchText", type => String) searchText: string,
    @Arg("searchMethod", type => LoaderSearchMethod, { nullable: true })
    searchMethod?: LoaderSearchMethod,
    @Arg("caseSensitive", type => Boolean, { nullable: true })
    caseSensitive?: boolean
  ) {
    return loader
      .loadEntity(Author)
      .info(info)
      .search({
        searchText,
        searchColumns: ["email", "firstName", "lastName"],
        searchMethod,
        caseSensitive
      })
      .loadMany();
  }
}

class AuthorNotFoundError extends Error {}
