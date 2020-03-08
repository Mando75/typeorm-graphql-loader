import { Connection, createConnection } from "typeorm";
import { LoaderNamingStrategyEnum } from "../";
import { GraphQLDatabaseLoader } from "../chaining";
import { seedDatabase } from "./common/seed";
import { GraphQLSchema, graphql } from "graphql";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { SnakeNamingStrategy } from "./common/snakeCaseNaming";
import { builder } from "./schema";
import * as chai from "chai";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

let connection: Connection;
let Posts: Post[], Users: User[];

describe("pagination", () => {
  let schema: GraphQLSchema;
  let loader: GraphQLDatabaseLoader;

  before(async () => {
    connection = await createConnection({
      name: "pagination",
      type: "sqlite",
      database: "test_pagination.sqlite3",
      synchronize: true,
      dropSchema: true,
      entities: [Post, User],
      logging: false,
      namingStrategy: new SnakeNamingStrategy()
    });

    await seedDatabase(connection);

    Users = await connection.getRepository(User).find({
      relations: ["posts"]
    });
    Posts = await connection.getRepository(Post).find({ relations: ["owner"] });

    schema = builder.build();
    loader = new GraphQLDatabaseLoader(connection, {
      namingStrategy: LoaderNamingStrategyEnum.SNAKECASE
    });
  });

  it("can perform a basic query with 0 offset and 15 limit", async () => {
    const result = await graphql(
      schema,
      `
        {
          paginatedPosts(pagination: { offset: 0, limit: 15 }) {
            hasMore
            offset
            posts {
              id
            }
          }
        }
      `,
      {},
      {
        loader
      }
    );
    expect(result).to.not.have.key("errors");
    expect(result.data!.paginatedPosts.posts).to.have.length(15);
    expect(result.data!.paginatedPosts).to.deep.equal({
      hasMore: true,
      offset: 15,
      posts: Posts.map(({ id }) => ({ id: id.toString() })).slice(0, 15)
    });
  });

  it("can perform an offset query", async () => {
    const result = await graphql(
      schema,
      `
        {
          paginatedPosts(pagination: { offset: 15, limit: 15 }) {
            hasMore
            offset
            posts {
              id
            }
          }
        }
      `,
      {},
      {
        loader
      }
    );

    expect(result).to.not.have.key("errors");
    expect(result.data!.paginatedPosts.posts).to.have.length(15);
    expect(result.data!.paginatedPosts).to.deep.equal({
      hasMore: true,
      offset: 30,
      posts: Posts.map(({ id }) => ({ id: id.toString() })).slice(15, 30)
    });
  });
});
