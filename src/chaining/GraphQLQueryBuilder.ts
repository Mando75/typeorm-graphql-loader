import { GraphQLResolveInfo } from "graphql";
import {
  ChainableWhereArgument,
  ChainableWhereExpression,
  FieldNodeInfo,
  QueryPredicates,
  SearchOptions
} from "../types";
import { GraphQLQueryManager } from "./GraphQLQueryManager";
import { ObjectLiteral } from "typeorm";

export class GraphQLQueryBuilder {
  private _info: GraphQLResolveInfo | FieldNodeInfo | null = null;
  private _andWhereExpressions: Array<ChainableWhereExpression> = [];
  private _orWhereExpressions: Array<ChainableWhereExpression> = [];
  private _searchExpressions: Array<SearchOptions> = [];

  constructor(
    private _manager: GraphQLQueryManager,
    private _entity: Function | string
  ) {}

  /**
   * Provide the query builder with the GraphQL Query info you would like to resolve
   * It is required to call this method before you can invoke any of the `load` methods
   * @param info
   * @returns GraphQLQueryBuilder
   */
  public info(info: GraphQLResolveInfo | FieldNodeInfo): GraphQLQueryBuilder {
    this._info = info;
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

  /**
   * Load one record from the database. This record will also join all the relations queried
   * for in the given GraphQL Resolve Info object. If you have not provided the query builder
   * with an info object, this method will raise an error
   * @throws Error Missing info argument
   */
  public async loadOne<T>(): Promise<T | undefined> {
    // We need to have an info object to parse
    this._validateInfo();

    // Get's the queried fields and checks if we already have this query cached
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info!,
      this._andWhereExpressions
    );

    // If the item was found, just return it
    if (found && item) {
      return item;
    }

    const promise = new Promise<T | undefined>((resolve, reject) => {
      this._manager.addQueueItem({
        many: false,
        key,
        fields,
        predicates: this._getQueryPredicates(),
        resolve,
        reject,
        entity: this._entity
      });
    });

    this._manager.addCacheItem(key, promise);
    return promise;
  }

  public async loadMany<T>(): Promise<T[] | undefined> {
    // we need to validate an info object
    this._validateInfo();
    const { fields, found, key, item } = this._manager.processQueryMeta(
      this._info!,
      this._andWhereExpressions
    );

    if (found && item) {
      return item;
    }

    const promise = new Promise<T[] | undefined>((resolve, reject) => {
      this._manager.addQueueItem({
        many: true,
        key,
        fields,
        predicates: this._getQueryPredicates(),
        resolve,
        reject,
        entity: this._entity
      });
    });

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
      orWhere: this._orWhereExpressions
    };
  }
}
