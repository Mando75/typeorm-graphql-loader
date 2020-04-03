import { LoaderOptions } from "./types";
import { Connection } from "typeorm";
import { GraphQLQueryBuilder } from "./GraphQLQueryBuilder";
import { GraphQLQueryManager } from "./GraphQLQueryManager";

/**
 * This is the base class for the loader. An instance of this class should
 * be passed to your request context. It is advised that a new instance be created
 * for every request to prevent data leaking.
 *
 * @example
 * ```typescript
 * import { GraphQLDatabaseLoader } from '@mando75/typeorm-graphql-loader';
 * const connection = createConnection({...}); // Create your TypeORM connection
 *
 * const apolloServer = new ApolloServer({
 *   schema,
 *   context: {
 *     loader: new GraphQLDatabaseLoader(connection, {/** additional options if needed**})
 *   },
 * });
 * ```
 */
export class GraphQLDatabaseLoader {
  private readonly _queryManager: GraphQLQueryManager;

  /**
   * Creates a new GraphQLDatabaseLoader instance. Needs a TypeORM connection
   * in order to execute queries
   *
   * @param connection - A {@link https://typeorm.io/#/connection | TypeORM Database connection}
   * @param options - Configuration options that will be used by this loader instance
   */
  constructor(connection: Connection, options: LoaderOptions = {}) {
    this._queryManager = new GraphQLQueryManager(connection, options);
  }

  /**
   * Specify a TypeORM entity that you would like to load. This method will
   * return a QueryBuilder for the entity you provide similar to how a TypeORM `createQueryBuilder`
   * method works
   *
   * @example
   * ```typescript
   * const userLoader = context.loader.loadEntity(User)
   * ```
   *
   * @param entity - The TypeORM entity you will be loading for this query.
   */
  public loadEntity(entity: Function | string): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder(this._queryManager, entity);
  }
}
