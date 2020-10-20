import {
  Arg,
  Ctx,
  FieldResolver,
  Info,
  Int,
  Mutation,
  Query,
  Resolver,
  Root
} from "type-graphql";
import { Author, Book, Publisher } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";
import {
  BookCreateError,
  BookCreateResultType,
  BookCreateSuccess
} from "../entity/Book";
import { Brackets, Connection } from "typeorm";

enum Transform {
  LOWERCASE = "LOWERCASE"
}

@Resolver(Book)
export class BookResolver {
  @FieldResolver(returns => String)
  async transformedTitle(
    @Arg("transform", type => String) transform: Transform,
    @Root() book: Book
  ) {
    return transform === Transform.LOWERCASE
      ? book.title.toLowerCase()
      : book.title.toUpperCase();
  }

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
    @Arg("useBrackets", { nullable: true, defaultValue: false })
    useBrackets: boolean = false,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    const orWhere = useBrackets
      ? new Brackets(qb =>
          qb.orWhere("books.authorId = :authorId", { authorId })
        )
      : "books.authorId = :authorId";
    return loader
      .loadEntity(Book, "books")
      .where("books.publisherId = :publisherId", { publisherId })
      .orWhere(orWhere, { authorId })
      .info(info)
      .loadMany();
  }

  @Mutation(returns => BookCreateResultType)
  async createBook(
    @Arg("title", type => String) title: string,
    @Arg("summary", type => String) summary: string,
    @Arg("authorId", type => Int) authorId: number,
    @Arg("publisherId", type => Int) publisherId: number,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Ctx("connection") connection: Connection,
    @Info() info: GraphQLResolveInfo
  ): Promise<typeof BookCreateResultType> {
    let book = new Book();

    book.author = new Author();
    book.author.id = authorId;
    book.publisher = new Publisher();
    book.publisher.id = publisherId;

    book.title = title;
    book.createdAt = new Date();
    book.updatedAt = new Date();
    book.publishedDate = new Date();
    book.isPublished = true;
    book.summary = summary;

    try {
      book = await connection.getRepository(Book).save(book);
    } catch (e) {
      return new BookCreateError("Error creating book: " + e);
    }

    return new BookCreateSuccess(
      (await loader
        .loadEntity(Book, "book")
        .where("book.id = :id", {
          id: book.id
        })
        .info(info, "BookCreateSuccess.data")
        .loadOne())!
    );
  }
}
