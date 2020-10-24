import { Arg, Ctx, Info, Query, Resolver } from "type-graphql";
import { Publisher } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";

@Resolver(Publisher)
export class PublisherResolver {
  @Query((returns) => Publisher)
  async publisherByBookTitle(
    @Arg("bookTitle") bookTitle: string,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    return loader
      .loadEntity(Publisher, "publisher")
      .ejectQueryBuilder((qb) => {
        qb.innerJoin("publisher.books", "book").where(
          "book.title = :bookTitle",
          { bookTitle }
        );
        return qb;
      })
      .info(info)
      .loadOne();
  }
}
