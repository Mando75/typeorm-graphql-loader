import { GraphQLResolveInfo } from "graphql";
import {
  WhereArgument,
  WhereExpression,
  FieldNodeInfo,
  QueryPagination,
  QueryPredicates,
  SearchOptions
} from "./types";
import { GraphQLQueryManager } from "./GraphQLQueryManager";
import { BaseEntity, ObjectLiteral, OrderByCondition } from "typeorm";
import { GraphQLInfoParser } from "./lib/GraphQLInfoParser";

export class GraphQLQueryBuilder<T extends typeof BaseEntity> {
  private _info: GraphQLResolveInfo | FieldNodeInfo | null = null;
  private _andWhereExpressions: Array<WhereExpression> = [];
  private _orWhereExpressions: Array<WhereExpression> = [];
  private _searchExpressions: Array<SearchOptions> = [];
  private _order: OrderByCondition = {};
  private _selectFields: Array<string | Array<string>> = [];
  private _pagination?: QueryPagination;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();
  private _context: any;

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
    if (fieldName) {
      this._info = this._parser.getFieldNode(info, fieldName);
    } else {
      this._info = info;
    }
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
        params
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
   * ```
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
    where: string,
    params?: ObjectLiteral
  ): GraphQLQueryBuilder<T> {
    this._orWhereExpressions.push({
      condition: where,
      params
    });
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
   *     .loadEntity(User)
   *     .info(info)
   *     .order({createdAt: 'ASC'})
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
  public context<K>(context: K) {
    this._context = context;
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
    return this._genericLoad<false, false>(false, false);
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
    return this._genericLoad<true, false>(true, false);
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
    return this._genericLoad<true, true>(true, true);
  }

  /**
   * A generic loader to handle duplicate logic
   * from all the load methods.
   * Makes sure all the options are passed to the manager
   * @param many
   * @param paginate
   */
  private async _genericLoad<U extends boolean, V extends boolean>(
    many: U,
    paginate: V
  ): Promise<
    V extends true
      ? [InstanceType<T>[], number]
      : U extends true
      ? InstanceType<T>[]
      : InstanceType<T> | undefined
  > {
    // we need to validate an info object
    this._validateInfo();
    // Check if this query is already in the cache
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info!,
      this._andWhereExpressions
    );

    // if it is we can just return it
    if (found && item) {
      return item;
    }

    // Otherwise build an executer and and add it to the cache
    const executor = (
      resolve: (value?: any) => void,
      reject: (reason?: any) => void
    ) => {
      this._manager.addQueueItem({
        many,
        key,
        fields,
        predicates: this._getQueryPredicates(),
        resolve,
        reject,
        entity: this._entity,
        pagination: paginate ? this._pagination : undefined,
        alias: this._alias
      });
    };

    const promise = new Promise(executor);

    this._manager.addCacheItem(key, promise);
    return promise;
  }

  /**
   * Throw an error if the info object has not been defined for this query
   */
  private _validateInfo() {
    if (this._info) {
      return true;
    } else {
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
      selectFields: this._selectFields.flat()
    };
  }
}
