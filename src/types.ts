import { FieldNode, FragmentDefinitionNode } from "graphql";
import { OrderByCondition } from "typeorm";
import { LoaderNamingStrategyEnum } from "./base";

export type LoaderOptions = {
  // Time-to-live for cache.
  ttl?: number;
  // Include if you are using one of the supported TypeORM custom naming strategies
  namingStrategy?: LoaderNamingStrategyEnum;
  // this column will always be loaded for every relation by the query builder.
  primaryKeyColumn?: string;
};

export type QueryOptions = {
  // How to order query results in SQL
  order?: OrderByCondition;
  // any valid OR conditions to be inserted into the WHERE clause
  orWhere?: [any];
  /**
   * Specify any fields that you may want to select that are not necessarily
   * included in the graphql query. e.g. you may want to always ge back the
   * id of the entity for auditing regardless of whether the client asked for
   * it in the graphql query
   */
  requiredSelectFields?: string[];
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

export type FeedNodeInfo = {
  fieldNodes: FieldNode[];
  fieldName: string;
  fragments: { [key: string]: FragmentDefinitionNode };
};
