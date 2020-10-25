import { GraphQLResolveInfo } from "graphql";
import {
  ConnectionArgs,
  EjectQueryCallback,
  GraphQLEntityFields,
  QueryPagination,
  QueryPredicates,
  SearchOptions,
  WhereArgument,
  WhereExpression,
} from "./types";
import { GraphQLQueryManager } from "./GraphQLQueryManager";
import { BaseEntity, ObjectLiteral, OrderByCondition } from "typeorm";
import { GraphQLInfoParser } from "./lib/GraphQLInfoParser";
import { LoaderQueryType } from "./enums/LoaderQueryType";

export class GraphQLQueryBuilder<T extends typeof BaseEntity> {
  private _info: GraphQLEntityFields | null = null;
  private _andWhereExpressions: Array<WhereExpression> = [];
  private _orWhereExpressions: Array<WhereExpression> = [];
  private _searchExpressions: Array<SearchOptions> = [];
  private _order: OrderByCondition = {};
  private _selectFields: Array<string | Array<string>> = [];
  private _pagination?: QueryPagination;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();
  private _context: any;
  private _ejectQueryCallback: EjectQueryCallback<T> | null = null;
  private _connectionArgs: ConnectionArgs | null = null;

  constructor(
    private _manager: GraphQLQueryManager,
    private _entity: Function | string,
    private _alias?: string
  ) {}

  /**
   * Provide the query builder with the GraphQL Query info you would like to resolve
   * It is required to call this method before you can invoke any of the `load*` methods
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *   return context
   *      .loader
   *      .loadEntity(User, "user")
   *      // Pass the GraphQLResolveInfo to the loader
   *      // before trying to load the data
   *      .info(info)
   *      .where("user.id = :id", {id: args.id})
   *      .loadOne()
   * }
   * ```
   *
   * @param info - The GraphQLResolveInfo object your resolver function will receive
   * @param fieldName - The path to a child field you would like to resolve, e.g. `edges.node`. [Commonly used with pagination](https://gitlab.com/Mando75/typeorm-graphql-loader/-/blob/master/md/pagination.md)
   * @returns GraphQLQueryBuilder
   */
  public info(
    info: GraphQLResolveInfo,
    fieldName?: string
  ): GraphQLQueryBuilder<T> {
    this._info = this._parser.parseResolveInfoModels(info, fieldName);
    return this;
  }

  /**
   * Provide the query builder a where condition. Multiple conditions can be added
   * by re-invoking the method (they get added to a list). Any where conditions added
   * via this method will be grouped in an AND expression
   *
   * This method uses the TypeORM SelectQueryBuilder where syntax. For more information,
   * see the {@link https://typeorm.io/#/select-query-builder/adding-where-expression|TypeORM docs}
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *  return context
   *    .loader
   *    .loadEntity(User, "users")
   *    .info(info)
   *    .where("users.id = :myId", {myId: args.id})
   *    .loadOne()
   * }
   *```
   * @param where - the {@link WhereArgument} you would like applied to the query
   * @param params - An optional parameter you can use to bind values for your where condition. See {@link https://github.com/typeorm/typeorm/blob/master/docs/select-query-builder.md#adding-where-expression|TypeORM docs}
   * @returns GraphQLQueryBuilder
   */
  public where(
    where: WhereArgument,
    params?: ObjectLiteral
  ): GraphQLQueryBuilder<T> {
    if (typeof where === "string") {
      this._andWhereExpressions.push({
        condition: where,
        params,
      });
    } else {
      this._andWhereExpressions.push(where);
    }
    return this;
  }

  /**
   * Provide the query builder with an OR WHERE condition. Multiple conditions can be added
   * by re-invoking the method (they get added to a list). Any where conditions added via this
   * method will be grouped in an OR expression. Should only be used after an initial WHERE condition.
   *
   * Like the {@link GraphQLQueryBuilder.where|where} method, it uses the SelectQueryBuilder where syntax
   *
   * @example
   * ```typescript
   *  loader
   *    .loadEntity(Book, "books")
   *    .info(info)
   *    .where("books.authorId = :authorId", {authorId: args.authorId})
   *    .orWhere("books.isPublicDomain = :includePublicDomain", {includePublicDomain: args.publicDomain})
   *    .loadMany()
   *```
   * @param where - the condition you would like applied to the query
   * @param params - An optional parameter you can use to bind values for your where condition. See {@link https://github.com/typeorm/typeorm/blob/master/docs/select-query-builder.md#adding-where-expression|TypeORM docs}
   * @returns GraphQLQueryBuilder
   */
  public orWhere(
    where: WhereArgument,
    params?: ObjectLiteral
  ): GraphQLQueryBuilder<T> {
    if (typeof where === "string") {
      this._orWhereExpressions.push({ condition: where, params });
    } else {
      this._orWhereExpressions.push(where);
    }
    return this;
  }

  /**
   * Provides an easy way to perform searches without needing to manually write SQL WHERE
   * conditions for each search instance
   *
   * The method accepts a searchOptions parameter that allows
   * you to define which columns should be searched, the type
   * of search, and other SQL options.
   *
   * If you need search columns to be concatenated, place the
   * columns to combine in a sub-array as seen with the name
   * columns in the example below. These columns will be concatenated
   * together with an empty string separator in the SQL query
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *   const searchOptions: SearchOptions = {
   *     searchColumns: ['email', ['firstName', 'lastName']]
   *     searchText: args.searchText
   *     // optional
   *     searchMethod: LoaderSearchMethod.STARTS_WITH
   *     // optional
   *     caseSensitive: false
   *   }
   *
   *   return context
   *     .loader
   *     .loadEntity(User)
   *     .info(info)
   *     .search(searchOptions)
   *     .loadMany()
   * }
   * ```
   *
   *
   * @param searchOptions - An {@link SearchOptions}that allows you to specify which columns should be searched and what to search for
   * @returns GraphQLQueryBuilder
   */
  public search(searchOptions: SearchOptions): GraphQLQueryBuilder<T> {
    this._searchExpressions.push(searchOptions);
    return this;
  }

  /**
   * Adds a SQL ORDER statement to the query.
   * See the {@link https://github.com/typeorm/typeorm/blob/master/docs/select-query-builder.md#adding-order-by-expression | TypeORM documentation for details}
   * If called multiple times, the Order By conditions will be merged
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, 'user')
   *     .info(info)
   *     .order({'user.createdAt': 'ASC'})
   *     .loadMany()
   * }
   * ```
   * @param order
   * @returns GraphQLQueryBuilder
   */
  public order(order: OrderByCondition): GraphQLQueryBuilder<T> {
    this._order = { ...this._order, ...order };
    return this;
  }

  /**
   * Manually specify fields you always want to be selected. This is
   * useful if you have custom resolvers for other fields on you GraphQL
   * type that may require data that isn't guaranteed to be in a query.
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, "user")
   *     .info(info)
   *     .where("user.id = :id", {id: args.id})
   *     // include the email and firstName fields
   *     // regardless of whether or not they were included in the query
   *     .selectFields(['email', 'firstName'])
   *     .loadOne()
   * }
   * ```
   * @param fields
   * @deprecated Use new `ConfigureLoader` decorator to require fields
   */
  public selectFields(fields: string | Array<string>): GraphQLQueryBuilder<T> {
    this._selectFields.push(fields);
    return this;
  }

  /**
   * Allows you to paginate the query using offset and limit.
   * If used, should be paired with {@link GraphQLQueryBuilder.loadPaginated|loadPaginated}, the other
   * loaders will ignore these options.
   *
   * @example
   * ```typescript
   * function resolver(obj, args, context, info) {
   *   const searchOptions: SearchOptions = {
   *     searchColumns: ["email"],
   *     searchText: args.searchText
   *   }
   *
   *   return context
   *     .loader
   *     .loadEntity(User)
   *     .info(info)
   *     .search(searchOptions)
   *     .paginate({offset: args.offset, limit: args.limit})
   *     .loadPaginated()
   * }
   * ```
   * @param pagination
   */
  public paginate(pagination: QueryPagination): GraphQLQueryBuilder<T> {
    this._pagination = pagination;
    return this;
  }

  public createConnection(
    connectionArgs: ConnectionArgs
  ): GraphQLQueryBuilder<T> {
    const { first, last, before, after } = connectionArgs;
    if ((first && first < 0) || (last && last < 0)) {
      throw new Error("first and last must be greater than 0");
    } else if (!before && !after) {
      throw new Error("Must pass a before or after cursor");
    }

    this._connectionArgs = connectionArgs;
    return this;
  }

  /**
   * Allows you to pass a user defined context to the loader. This context will
   * be passed to the decorator predicates at resolve time.
   *
   * @example
   * ```typescript
   * function resolve(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, "user")
   *     .info(info)
   *     .where("user.id = :id", { id: args.id })
   *     // this method accepts any value for the context
   *     .context({ requireRelation: true, ignoreField: false })
   *     .loadOne()
   * }
   * ```
   *
   * @param context
   */
  public context<K>(context: K): GraphQLQueryBuilder<T> {
    this._context = context;
    return this;
  }

  /**
   * Receives a callback that can be used to modify the TypeORM SelectQueryBuilder instance
   * before the loader executes the database query.
   *
   * Please note that this callback is run AFTER the loader has already applied all provided conditions to the query builder
   * (where conditions, pagination, order, etc). Be aware, as changes you make to the ejected query builder could conflict
   * with loader applied settings. Some tips to avoid potential conflicts:
   *
   * - If you are using the eject callback to apply where conditions, move all of your where conditions to the callback.
   *   This will prevent potential conflicts between where conditions applied via the loader wrapper being overwritten
   *   by conditions applied via the eject callback. Keep all your where conditions in one place.
   *
   * - For most cases, if you plan on joining tables in the callback, be sure to [join WITHOUT selecting](https://typeorm.io/#/select-query-builder/join-without-selection).
   *   This is to prevent issues with selecting data from the same table twice, and is generally more performant.
   *   If you are wanting a relation or column to always be joined and selected, see the {@link ConfigureLoader} Decorator
   *
   * @example
   * ```typescript
   * function resolve(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, "user")
   *     .info(info)
   *     .ejectQueryBuilder(qb => {
   *       return qb.innerJoin("user.group", "group")
   *          .where("group.name = :groupName", { groupName: args.groupName })
   *     })
   *     .loadMany()
   * }
   * ```
   *
   * @param cb
   */
  public ejectQueryBuilder(cb: EjectQueryCallback<T>): GraphQLQueryBuilder<T> {
    this._ejectQueryCallback = cb;
    return this;
  }

  /**
   * Load one record from the database.
   * This record will include all relations and fields requested
   * in the GraphQL query that exist on the TypeORM entities.
   * If you have not provided the query builder
   * with an info object, this method will raise an error
   *
   * @example
   * ```typescript
   * function resolve(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, "user")
   *     .info(info)
   *     .where("user.id = :id", {id: args.id})
   *     .loadOne()
   * }
   * ```
   * @throws Error Missing info argument
   */
  public async loadOne(): Promise<InstanceType<T> | undefined> {
    return this._genericLoad<LoaderQueryType.SINGLE>(LoaderQueryType.SINGLE);
  }

  /**
   * Load multiple records from the database.
   * These records will include all the relations and fields
   * requested in the GraphQL query that exist on the TypeORM entities.
   * If you have not provided the query builder with an info object,
   * this method will raise an error.
   * @example
   * ```typescript
   * function resolve(obj, args, context, info) {
   *   return context
   *     .loader
   *     .loadEntity(User, "user")
   *     .info(info)
   *     .where("user.id = :id", {id: args.id})
   *     .loadOne()
   * }
   * ```
   * @throws Error Missing info argument
   */
  public async loadMany(): Promise<InstanceType<T>[]> {
    return this._genericLoad<LoaderQueryType.MANY>(LoaderQueryType.MANY);
  }

  /**
   * Loads a paginated set of records via offset and limit (see {@link GraphQLQueryBuilder.paginate})
   * Will return the set of records and overall record count (ignores limit). This count can be
   * used to build the next offset. Please note that the loader will not do any offset/limit calculations
   * for you, it will only apply the values you give it.
   * See [Pagination Advice](https://gitlab.com/Mando75/typeorm-graphql-loader/-/blob/master/md/pagination.md) for more info
   */
  public async loadPaginated(): Promise<[InstanceType<T>[], number]> {
    if (!this._pagination) {
      throw new Error(
        "Must provide pagination object before calling load paginated"
      );
    }
    return this._genericLoad<LoaderQueryType.PAGINATED>(
      LoaderQueryType.PAGINATED
    );
  }

  /**
   * TODO
   */
  public async loadConnection(): Promise<undefined> {
    if (!this._connectionArgs) {
      throw new Error(
        "Must provide connection arguments before calling load connection"
      );
    }
    return this._genericLoad<LoaderQueryType.RELAY>(LoaderQueryType.RELAY);
  }

  /**
   * A generic loader to handle duplicate logic
   * from all the load methods.
   * Makes sure all the options are passed to the manager
   * @param type
   */
  private async _genericLoad<U extends LoaderQueryType>(
    type: LoaderQueryType
  ): Promise<
    U extends LoaderQueryType.PAGINATED
      ? [InstanceType<T>[], number]
      : U extends LoaderQueryType.MANY
      ? InstanceType<T>[]
      : U extends LoaderQueryType.SINGLE
      ? InstanceType<T> | undefined
      : undefined
  > {
    // we need to validate an info object
    this._validateInfo(this._info);
    // Check if this query is already in the cache
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info,
      this._andWhereExpressions
    );

    // if it is we can just return it
    if (found && item) {
      return item;
    }

    // Otherwise build an executor and and add it to the cache
    const executor = (
      resolve: (value?: any) => void,
      reject: (reason?: any) => void
    ) => {
      this._manager.addQueueItem({
        type,
        key,
        fields,
        predicates: this._getQueryPredicates(),
        resolve,
        reject,
        entity: this._entity,
        pagination: this._pagination,
        alias: this._alias,
        context: this._context,
        ejectQueryCallback: this._ejectQueryCallback ?? ((qb) => qb),
      });
    };

    const promise = new Promise(executor);

    this._manager.addCacheItem(key, promise);
    return promise;
  }

  /**
   * Throw an error if the info object has not been defined for this query
   */
  private _validateInfo(
    info?: GraphQLEntityFields | null
  ): asserts info is GraphQLEntityFields {
    if (!this._info) {
      throw new Error(
        "Missing GraphQL Resolve info. Please invoke `.info()` before calling this method"
      );
    }
  }

  /**
   * Takes all the query options and bundles them
   * together into a single object
   * @private
   */
  private _getQueryPredicates(): QueryPredicates {
    return {
      search: this._searchExpressions,
      andWhere: this._andWhereExpressions,
      orWhere: this._orWhereExpressions,
      order: this._order,
      selectFields: this._selectFields.flat(),
    };
  }
}
