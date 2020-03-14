import { FieldNode, FragmentDefinitionNode } from "graphql";
import { ObjectLiteral, OrderByCondition, Brackets } from "typeorm";
import { LoaderNamingStrategyEnum } from "./chaining/enums/LoaderNamingStrategy";
import { LoaderSearchMethod } from "./chaining/enums/LoaderSearchMethod";

export type ChainableWhereArgument =
  | string
  | Brackets
  | ObjectLiteral
  | Array<ObjectLiteral>;

export type ChainableWhereExpression =
  | LoaderWhereExpression
  | Brackets
  | ObjectLiteral
  | Array<ObjectLiteral>;

export type LoaderWhereExpression = {
  isLoaderWhereExpression: boolean;
  condition: string;
  params?: ObjectLiteral;
};

export type LoaderOptions = {
  // Time-to-live for cache.
  ttl?: number;
  // Include if you are using one of the supported TypeORM custom naming strategies
  namingStrategy?: LoaderNamingStrategyEnum;
  // this column will always be loaded for every relation by the query builder.
  primaryKeyColumn?: string;
  // Use this search method by default unless overwritten in a query option. Defaults to any position
  defaultSearchMethod?: LoaderSearchMethod;
};

export type QueryOptions = {
  // How to order query results in SQL
  order?: OrderByCondition;
  // any valid OR conditions to be inserted into the WHERE clause
  orWhere?: Array<any>;
  /**
   * Specify any fields that you may want to select that are not necessarily
   * included in the graphql query. e.g. you may want to always ge back the
   * id of the entity for auditing regardless of whether the client asked for
   * it in the graphql query
   */
  requiredSelectFields?: Array<string>;
  /**
   * Include if wanting to search fields for text. Uses LIKE
   */
  search?: SearchOptions;
};

export type SearchOptions = {
  /*
   * The database columns to be searched
   * If columns need to be joined in an or, pass them in as a nested array.
   * e.g. ["email", ["firstName", "lastName"]]
   * This will produce a query like the following:
   * `WHERE email LIKE :searchText
   *  OR firstName || ' ' || lastName LIKE :searchText
   **/
  searchColumns: Array<string | Array<string>>;
  // The text to compare column values with
  searchText: string;
  // Optionally specify a search method. If not provided, default will be used (see LoaderOptions)
  searchMethod?: LoaderSearchMethod;
  // Whether the query is case sensitive. Default to false. Uses SQL LOWER to perform comparison
  caseSensitive?: boolean;
};

export type QueryPagination = {
  // the max number of records to return
  limit: number;
  // the offset from where to return records
  offset: number;
};

export type QueueItem = {
  many: boolean;
  key: string;
  batchIdx: number;
  fields: Selection | null;
  where: any;
  resolve: (value?: any) => any;
  reject: (reason: any) => void;
  entity: Function | string;
  pagination?: QueryPagination;
  options?: QueryOptions;
};

export type QueryPredicates = {
  andWhere: Array<ChainableWhereExpression>;
  orWhere: Array<ChainableWhereExpression>;
  search: Array<SearchOptions>;
};

export type ChainableQueueItem = {
  many: boolean;
  key: string;
  fields: Selection | null;
  predicates: QueryPredicates;
  resolve: (value?: any) => any;
  reject: (reason: any) => void;
  entity: Function | string;
  pagination?: QueryPagination;
};

export type QueryMeta = {
  key: string;
  fields: Selection | null;
  found: boolean;
  item?: Promise<any>;
};

export type Hash<T> = {
  [key: string]: T;
};

export type Selection = {
  arguments?: Hash<{ name: string; value: any }>;
  children?: Hash<Selection>;
};

export type FieldNodeInfo = {
  fieldNodes: FieldNode[];
  fieldName: string;
  fragments: { [key: string]: FragmentDefinitionNode };
};
