import { GraphQLResolveInfo } from "graphql";
import {
  ChainableWhereArgument,
  ChainableWhereExpression,
  FieldNodeInfo,
  QueryPagination,
  QueryPredicates,
  SearchOptions
} from "./types";
import { GraphQLQueryManager } from "./GraphQLQueryManager";
import { ObjectLiteral, OrderByCondition } from "typeorm";
import { GraphQLInfoParser } from "./lib/GraphQLInfoParser";

export class GraphQLQueryBuilder {
  private _info: GraphQLResolveInfo | FieldNodeInfo | null = null;
  private _andWhereExpressions: Array<ChainableWhereExpression> = [];
  private _orWhereExpressions: Array<ChainableWhereExpression> = [];
  private _searchExpressions: Array<SearchOptions> = [];
  private _order: OrderByCondition = {};
  private _pagination?: QueryPagination;
  private _parser: GraphQLInfoParser = new GraphQLInfoParser();

  constructor(
    private _manager: GraphQLQueryManager,
    private _entity: Function | string
  ) {}

  /**
   * Provide the query builder with the GraphQL Query info you would like to resolve
   * It is required to call this method before you can invoke any of the `load` methods
   * @param info
   * @param fieldName - Optional parameter to specify a subfield in the query to load
   * @returns GraphQLQueryBuilder
   */
  public info(
    info: GraphQLResolveInfo,
    fieldName?: string
  ): GraphQLQueryBuilder {
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
   * @param where
   * @param params
   * @returns GraphQLQueryBuilder
   */
  public where(
    where: ChainableWhereArgument,
    params?: ObjectLiteral
  ): GraphQLQueryBuilder {
    if (typeof where === "string") {
      this._andWhereExpressions.push({
        condition: where,
        params,
        isLoaderWhereExpression: true
      });
    } else {
      this._andWhereExpressions.push(where);
    }
    return this;
  }

  /**
   * Provide the query builder with an OR WHERE condition. Multiple conditions can be added
   * by reinvoking the method (they get added to a list). Any where conditions added via this
   * method will be grouped in an OR expression
   * @param where
   * @param params
   * @returns GraphQLQueryBuilder
   */
  public orWhere(
    where: ChainableWhereArgument,
    params?: ObjectLiteral
  ): GraphQLQueryBuilder {
    if (typeof where === "string") {
      this._orWhereExpressions.push({
        condition: where,
        params,
        isLoaderWhereExpression: true
      });
    } else {
      this._orWhereExpressions.push(where);
    }
    return this;
  }

  public search(searchOptions: SearchOptions): GraphQLQueryBuilder {
    this._searchExpressions.push(searchOptions);
    return this;
  }

  public order(order: OrderByCondition): GraphQLQueryBuilder {
    this._order = { ...this._order, ...order };
    return this;
  }

  public paginate(pagination: QueryPagination): GraphQLQueryBuilder {
    this._pagination = pagination;
    return this;
  }

  /**
   * Load one record from the database. This record will also join all the relations queried
   * for in the given GraphQL Resolve Info object. If you have not provided the query builder
   * with an info object, this method will raise an error
   * @throws Error Missing info argument
   */
  public async loadOne<T>(): Promise<T | undefined> {
    return this._genericLoad<T, false, false>(false, false);
  }

  public async loadMany<T>(): Promise<T[] | undefined> {
    return this._genericLoad<T, true, false>(true, false);
  }

  public async loadPaginated<T>(): Promise<[T[], number]> {
    if (!this._pagination) {
      throw new Error(
        "Must provide pagination object before calling load paginated"
      );
    }
    return this._genericLoad<T, true, true>(true, true);
  }

  private async _genericLoad<T, U extends boolean, V extends boolean>(
    many: U,
    paginate: V
  ): Promise<
    V extends true ? [T[], number] : U extends true ? T[] : T | undefined
  > {
    // we need to validate an info object
    this._validateInfo();
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info!,
      this._andWhereExpressions
    );

    if (found && item) {
      return item;
    }

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
        pagination: paginate ? this._pagination : undefined
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

  private _getQueryPredicates(): QueryPredicates {
    return {
      search: this._searchExpressions,
      andWhere: this._andWhereExpressions,
      orWhere: this._orWhereExpressions,
      order: this._order
    };
  }
}
