import "reflect-metadata";
import {
  FieldConfigurationPredicate,
  GraphQLEntityFields,
  LoaderFieldConfiguration,
  RequireOrIgnoreSettings,
} from "./types";

/**
 * Internal keys for mapping entity metadata
 * @hidden
 */
const keys = {
  IGNORE_FIELD: Symbol("gqlLoader:ignoreField"),
  REQUIRED_FIELD: Symbol("gqlLoader:requiredField"),
  GRAPHQL_NAME: Symbol("gqlLoader:graphQLName"),
  SQL_JOIN_ALIAS: Symbol("gqlLoader:sqlJoinAlias"),
};

/**
 * Default args
 * @hidden
 */
const defaultLoaderFieldConfiguration: LoaderFieldConfiguration = {
  ignore: false,
  required: false,
};

/**
 * An experimental decorator that can be used
 * to annotate fields or relations in your TypeORM entities
 * and customize the loader resolution logic.
 *
 * The decorator implementation is still being developed
 * and the API may change in the future prior to a 2.0 release.
 *
 * @example
 * ```typescript
 * @Entity()
 * class Author extends BaseEntity {
 *
 *   // This relation will never be fetched by the dataloader
 *   @ConfigureLoader({ignore: true})
 *   @OneToMany()
 *   books: [Book]
 *
 *   // This relation will always be fetched by the dataloader
 *   @ConfigureLoader({required: true})
 *   @OneToOne()
 *   user: User
 * }
 * ```
 *
 * @param options - See {@link LoaderFieldConfiguration}
 */
export const ConfigureLoader = (options: LoaderFieldConfiguration) => {
  const { required, ignore, graphQLName, sqlJoinAlias } = {
    ...defaultLoaderFieldConfiguration,
    ...options,
  };

  return (target: any, propertyKey: string) => {
    const ignoreSettings: RequireOrIgnoreSettings =
      Reflect.getMetadata(keys.IGNORE_FIELD, target.constructor) ?? new Map();
    ignoreSettings.set(propertyKey, ignore);
    Reflect.defineMetadata(
      keys.IGNORE_FIELD,
      ignoreSettings,
      target.constructor
    );

    const requiredSettings: RequireOrIgnoreSettings =
      Reflect.getMetadata(keys.REQUIRED_FIELD, target.constructor) ?? new Map();
    requiredSettings.set(propertyKey, required);
    Reflect.defineMetadata(
      keys.REQUIRED_FIELD,
      requiredSettings,
      target.constructor
    );

    const graphQLFieldNames: Map<string, string> =
      Reflect.getMetadata(keys.GRAPHQL_NAME, target.constructor) ?? new Map();
    graphQLFieldNames.set(propertyKey, graphQLName ?? propertyKey);
    Reflect.defineMetadata(
      keys.GRAPHQL_NAME,
      graphQLFieldNames,
      target.constructor
    );

    const sqlJoinAliases: Map<
      string,
       string | undefined
    > =
      Reflect.getMetadata(keys.SQL_JOIN_ALIAS, target.constructor) ?? new Map();
    sqlJoinAliases.set(propertyKey, sqlJoinAlias);
    Reflect.defineMetadata(
      keys.SQL_JOIN_ALIAS,
      sqlJoinAliases,
      target.constructor
    );
  };
};

/**
 * Fetch the required fields from entity metadata
 * @hidden
 * @param target
 */
export const getLoaderRequiredFields = (target: any): RequireOrIgnoreSettings =>
  Reflect.getMetadata(keys.REQUIRED_FIELD, target) ?? new Map();

/**
 * Fetch the ignored fields from entity metadata
 * @hidden
 * @param target
 */
export const getLoaderIgnoredFields = (target: any): RequireOrIgnoreSettings =>
  Reflect.getMetadata(keys.IGNORE_FIELD, target) ?? new Map();

/**
 * Returns mapping of TypeORM entity fields with their GraphQL schema names
 * @hidden
 * @param target
 */
export const getGraphQLFieldNames = (target: any): Map<string, string> =>
  Reflect.getMetadata(keys.GRAPHQL_NAME, target) ?? new Map();

/**
 * Determines if predicate needs to be called as a function and passes
 * the proper arguments if so
 * @hidden
 * @param predicate
 * @param context
 * @param selection
 */
export const resolvePredicate = (
  predicate: boolean | FieldConfigurationPredicate | undefined,
  context: any,
  selection: GraphQLEntityFields | undefined
): boolean | undefined =>
  typeof predicate === "function"
    ? predicate(
        context,
        Object.getOwnPropertyNames(selection ?? {}),
        selection ?? {}
      )
    : predicate;

/**
 * Get the user-defined table aliases for a given entity
 * @hidden
 * @param target
 */
export const getSQLJoinAliases = (
  target: any
): Map<string, string | undefined> =>
  Reflect.getMetadata(keys.SQL_JOIN_ALIAS, target) ?? new Map();

