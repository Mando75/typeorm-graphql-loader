import { FieldNode, FragmentDefinitionNode } from "graphql";
import { ObjectLiteral, OrderByCondition, Brackets } from "typeorm";
import { LoaderNamingStrategyEnum } from "./enums/LoaderNamingStrategy";
import { LoaderSearchMethod } from "./enums/LoaderSearchMethod";

export type WhereArgument =
  | string
  | Brackets
  | ObjectLiteral
  | Array<ObjectLiteral>;

export type WhereExpression =
  | LoaderWhereExpression
  | Brackets
  | ObjectLiteral
  | Array<ObjectLiteral>;

/**
 * @hidden
 */
export interface LoaderWhereExpression {
  isLoaderWhereExpression: boolean;
  condition: string;
  params?: ObjectLiteral;
}

export interface LoaderOptions {
  /**
   * Include if you are using one of the supported TypeORM custom naming strategies
   */
  namingStrategy?: LoaderNamingStrategyEnum;
  /**
   * This column will always be loaded for every relation by the query builder.
   */
  primaryKeyColumn?: string;
  /**
   * Use this search method by default unless overwritten in a query option. Defaults to any position
   */
  defaultSearchMethod?: LoaderSearchMethod;
}

export interface SearchOptions {
  /**
   * The database columns to be searched
   * If columns need to be joined in an or, pass them in as a nested array.
   * e.g. ["email", ["firstName", "lastName"]]
   * This will produce a query like the following:
   * `WHERE email LIKE :searchText
   *  OR firstName || ' ' || lastName LIKE :searchText
   */
  searchColumns: Array<string | Array<string>>;
  /**
   * The text to be searched for
   */
  searchText: string;
  /**
   * Optionally specify a search method. If not provided, default will be used (see LoaderOptions)
   */
  searchMethod?: LoaderSearchMethod;
  /**
   * Whether the query is case sensitive. Default to false. Uses SQL LOWER to perform comparison
   */
  caseSensitive?: boolean;
}

export interface QueryPagination {
  /**
   * the max number of records to return
   */
  limit: number;
  /**
   * the offset from where to return records
   */
  offset: number;
}

/**
 * @hidden
 */
export interface QueryPredicates {
  andWhere: Array<WhereExpression>;
  orWhere: Array<WhereExpression>;
  search: Array<SearchOptions>;
  order: OrderByCondition;
  selectFields: Array<string>;
}

/**
 * @hidden
 */
export interface QueueItem {
  many: boolean;
  key: string;
  fields: Selection | null;
  predicates: QueryPredicates;
  resolve: (value?: any) => any;
  reject: (reason: any) => void;
  entity: Function | string;
  pagination?: QueryPagination;
}

/**
 * @hidden
 */
export interface QueryMeta {
  key: string;
  fields: Selection | null;
  found: boolean;
  item?: Promise<any>;
}

/**
 * @hidden
 */
export interface Hash<T> {
  [key: string]: T;
}

/**
 * @hidden
 */
export interface Selection {
  arguments?: Hash<{ name: string; value: any }>;
  children?: Hash<Selection>;
}

/**
 * @hidden
 */
export interface FieldNodeInfo {
  fieldNodes: FieldNode[];
  fieldName: string;
  fragments: { [key: string]: FragmentDefinitionNode };
}
